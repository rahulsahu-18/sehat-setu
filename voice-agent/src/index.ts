import {
  Agent,
  AgentSession,
  AgentSessionEventTypes,
  type JobContext,
  ServerOptions,
  cli,
  defineAgent,
} from "@livekit/agents";
import * as openai from "@livekit/agents-plugin-openai";
import * as sarvam from "@livekit/agents-plugin-sarvam";
import dotenv from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Resolve the worker's env file from the package directory, not the caller's
// working directory. This works for both src/index.ts and dist/index.js.
dotenv.config({
  path: resolve(dirname(fileURLToPath(import.meta.url)), "../.env"),
});

type FollowUpContext = {
  questionId: string;
  question: string;
  language: "english" | "hindi" | "odia";
};

const languageNames: Record<FollowUpContext["language"], string> = {
  english: "English",
  hindi: "Hindi",
  odia: "Odia",
};
const sarvamLanguageCodes: Record<FollowUpContext["language"], string> = {
  english: "en-IN",
  hindi: "hi-IN",
  odia: "od-IN",
};

function parseMetadata(value: string | undefined): { workflow?: string; questionId?: string; language?: string } {
  if (!value) return {};
  try {
    return JSON.parse(value) as { workflow?: string; questionId?: string; language?: string };
  } catch {
    return {};
  }
}

function resolveApiBase() {
  const configured = (process.env.VOICE_AGENT_API_BASE_URL || "http://127.0.0.1:5000").trim();
  // The internal route is mounted at the server root, not under /api/v1.
  // Accept either a server origin or a frontend-style base URL ending in /api/v1.
  return configured.replace(/\/+$/, "").replace(/\/api\/v1$/i, "");
}

async function loadFollowUp(questionId: string): Promise<FollowUpContext> {
  const apiBase = resolveApiBase();
  const secret = process.env.VOICE_AGENT_SECRET?.trim();
  if (!secret) {
    throw new Error("VOICE_AGENT_SECRET is missing in voice-agent/.env.");
  }

  const endpoint = `${apiBase}/internal/voice/follow-ups/${encodeURIComponent(questionId)}`;
  let response: Response;
  try {
    response = await fetch(endpoint, {
      headers: { "X-Voice-Agent-Secret": secret },
      signal: AbortSignal.timeout(10000),
    });
  } catch {
    throw new Error(
      `Could not reach the SehatSetu API at ${apiBase}. Check that the server is running and VOICE_AGENT_API_BASE_URL uses its actual PORT.`,
    );
  }

  if (!response.ok) {
    // The API only returns a short, non-sensitive error code/message here.
    // Never include the question text, answer, tokens, or shared secret in logs.
    let apiError: { code?: string; message?: string } = {};
    try {
      const body = await response.json() as { code?: string; message?: string };
      apiError = body;
    } catch {
      // HTML 404 pages usually indicate that the base URL points at the wrong service.
    }

    if (response.status === 401) {
      throw new Error(
        "The SehatSetu API rejected X-Voice-Agent-Secret. Set the same VOICE_AGENT_SECRET in server/.env and voice-agent/.env, then restart both.",
      );
    }
    if (response.status === 404 && !apiError.code) {
      throw new Error(
        `SehatSetu returned HTTP 404 from ${endpoint}. Check VOICE_AGENT_API_BASE_URL points to the Express server root (for example http://127.0.0.1:5000), not the React/Vite URL.`,
      );
    }
    throw new Error(
      `SehatSetu API returned HTTP ${response.status}${apiError.code ? ` (${apiError.code})` : ""}: ${apiError.message || "follow-up context unavailable"}`,
    );
  }

  const payload = await response.json() as {
    success?: boolean;
    data?: { questionId?: string; question?: string; language?: string };
  };
  const data = payload.data;
  if (
    !payload.success ||
    String(data?.questionId ?? "").toLowerCase() !== questionId.toLowerCase() ||
    typeof data.question !== "string" ||
    !data.question.trim() ||
    !["english", "hindi", "odia"].includes(data.language || "")
  ) {
    throw new Error(
      "The SehatSetu API returned an invalid follow-up context. Verify the question ID and the API/database used by the backend.",
    );
  }
  return {
    questionId,
    question: data.question.trim(),
    language: data.language as FollowUpContext["language"],
  };
}

async function publishTranscript(ctx: JobContext, transcript: string, language: string) {
  try {
    const payload = new TextEncoder().encode(JSON.stringify({
      type: "sehatsetu.followup.transcript",
      transcript,
      language,
    }));
    await ctx.room.localParticipant?.publishData(payload, {
      reliable: true,
      topic: "sehatsetu-followup-transcript",
    });
  } catch {
    // Do not log the patient's transcript. The patient can still use the text fallback.
  }
}

export default defineAgent({
  entry: async (ctx: JobContext) => {
    const metadata = parseMetadata(ctx.job.metadata || ctx.room.metadata);
    if (metadata.workflow !== "doctor-follow-up" || !metadata.questionId) {
      throw new Error("Unsupported voice workflow metadata.");
    }

    // Jobs are assigned before the browser participant finishes connecting.
    // Explicitly join the LiveKit room before creating session/event listeners.
    await ctx.connect();

    const followUp = await loadFollowUp(metadata.questionId);
    if (!process.env.OPENAI_API_KEY?.trim()) {
      throw new Error("OpenAI credentials are missing for the LiveKit agent.");
    }

    const language = languageNames[followUp.language];
    const agent = Agent.create({
      instructions: [
        "You are the speech interface for a healthcare follow-up form, not a clinician.",
        `The patient language is ${language}.`,
        "The one and only source question was written by a healthcare professional.",
        "Read the exact question text verbatim, preserving its original words and script. Do not translate an English question into Hindi/Odia or a Hindi/Odia question into English. The selected voice language is based on the question itself, not the patient's general profile.",
        "After asking the exact question, listen to the patient and let them answer in that same language. Keep the transcript in that language and native script. If the answer is unclear, ask one brief, neutral clarification in the same language or repeat the original question on request.",
        "Do not add a greeting before the question or insert your own medical questions.",
        "Never diagnose, prescribe, recommend treatment, or answer medical questions yourself. Never imply a clinician has reviewed the answer.",
        "Keep speech concise and do not discuss any other subject.",
      ].join(" "),
    });

    // OpenAI STT/TTS are used for English. Sarvam provides explicit Indian
    // language transcription and speech synthesis so Hindi/Odia answers remain
    // in their native script instead of being translated to English.
    let stt: InstanceType<typeof openai.STT> | InstanceType<typeof sarvam.STT>;
    let tts: InstanceType<typeof openai.TTS> | InstanceType<typeof sarvam.TTS>;
    if (followUp.language === "english") {
      stt = new openai.STT({
        model: process.env.OPENAI_TRANSCRIPTION_MODEL || "whisper-1",
        language: "en",
        useRealtime: false,
      });
      tts = new openai.TTS({
        model: process.env.OPENAI_TTS_MODEL || "gpt-4o-mini-tts",
        voice: "alloy",
        instructions: "Speak clear, natural English. Read the supplied clinician question faithfully.",
      });
    } else {
      if (!process.env.SARVAM_API_KEY?.trim()) {
        throw new Error(
          "Hindi/Odia voice requires SARVAM_API_KEY in voice-agent/.env. Text answers remain available.",
        );
      }
      const sarvamLanguage = sarvamLanguageCodes[followUp.language];
      stt = new sarvam.STT({
        languageCode: sarvamLanguage,
        model: "saaras:v3",
        mode: "transcribe",
      });
      tts = new sarvam.TTS({
        targetLanguageCode: sarvamLanguage,
        model: "bulbul:v3",
        speaker: process.env.SARVAM_TTS_SPEAKER || "shubh",
        pace: 1.0,
      });
    }

    const session = new AgentSession({
      stt,
      llm: new openai.LLM({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      }),
      tts,
    });

    session.on(AgentSessionEventTypes.UserInputTranscribed, (event) => {
      if (!event.isFinal || !event.transcript.trim()) return;
      void publishTranscript(ctx, event.transcript.trim(), followUp.language);
    });

    // Let the patient client pause its microphone during synthesized speech to
    // avoid transcribing the agent's own audio as a patient response.
    session.on(AgentSessionEventTypes.AgentStateChanged, (event) => {
      try {
        const payload = new TextEncoder().encode(JSON.stringify({
          type: "sehatsetu.followup.agent-state",
          state: event.newState,
        }));
        void ctx.room.localParticipant?.publishData(payload, {
          reliable: true,
          topic: "sehatsetu-followup-agent-state",
        });
      } catch {
        // State signalling is advisory; text answer submission remains available.
      }
    });

    session.on(AgentSessionEventTypes.Error, () => {
      // Provider/session errors are intentionally not logged with transcript or prompt details.
      console.error("LiveKit follow-up agent encountered a provider/session error.");
    });

    await session.start({
      room: ctx.room,
      agent,
      inputOptions: { deleteRoomOnClose: true },
    });
    await session.generateReply({
      instructions: [
        `Read the following healthcare professional's question exactly as written, using ${language} speech. Do not translate the text or add a greeting:`,
        followUp.question,
        "After reading the exact question, listen to the patient. Accept the answer in the same language and do not translate it. Do not provide medical advice or ask extra questions unless one neutral clarification is needed.",
      ].join("\n"),
      allowInterruptions: true,
    });
  },
});

const agentName = process.env.LIVEKIT_AGENT_NAME || "sehatsetu-followup-agent";
cli.runApp(new ServerOptions({
  agent: fileURLToPath(import.meta.url),
  agentName,
}));
