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
import dotenv from "dotenv";
import { fileURLToPath } from "node:url";

dotenv.config();

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
const languageCodes: Record<FollowUpContext["language"], string> = {
  english: "en",
  hindi: "hi",
  odia: "or",
};

function parseMetadata(value: string | undefined): { workflow?: string; questionId?: string; language?: string } {
  if (!value) return {};
  try {
    return JSON.parse(value) as { workflow?: string; questionId?: string; language?: string };
  } catch {
    return {};
  }
}

async function loadFollowUp(questionId: string): Promise<FollowUpContext> {
  const apiBase = (process.env.VOICE_AGENT_API_BASE_URL || "http://localhost:5000").replace(/\/$/, "");
  const secret = process.env.VOICE_AGENT_SECRET?.trim();
  if (!secret) throw new Error("Voice agent service secret is not configured.");
  const response = await fetch(
    `${apiBase}/internal/voice/follow-ups/${encodeURIComponent(questionId)}`,
    {
      headers: { "X-Voice-Agent-Secret": secret },
      signal: AbortSignal.timeout(10000),
    },
  );
  if (!response.ok) throw new Error("The requested follow-up context is unavailable.");
  const payload = await response.json() as {
    success?: boolean;
    data?: { questionId?: string; question?: string; language?: string };
  };
  const data = payload.data;
  if (
    !payload.success ||
    data?.questionId !== questionId ||
    typeof data.question !== "string" ||
    !data.question.trim() ||
    !["english", "hindi", "odia"].includes(data.language || "")
  ) {
    throw new Error("The follow-up context was invalid.");
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
    await ctx.room.localParticipant.publishData(payload, {
      reliable: true,
      topic: "sehatsetu-followup-transcript",
    });
  } catch {
    // Do not log the patient's transcript. The patient can still use the text fallback.
  }
}

const agentDefinition = defineAgent({
  entry: async (ctx: JobContext) => {
    const metadata = parseMetadata(ctx.job.metadata || ctx.room.metadata);
    if (metadata.workflow !== "doctor-follow-up" || !metadata.questionId) {
      throw new Error("Unsupported voice workflow metadata.");
    }

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
        "Ask that question faithfully in the selected patient language. Translate only when necessary, preserving the meaning and uncertainty; do not add subquestions.",
        "After asking it, listen to the patient. If their answer is unclear, ask one brief, neutral clarification or repeat the original question on request.",
        "Never diagnose, prescribe, recommend treatment, or answer medical questions yourself. Never imply a clinician has reviewed the answer.",
        "Keep speech concise and do not discuss any other subject.",
      ].join(" "),
    });

    const session = new AgentSession({
      stt: new openai.STT({
        model: process.env.OPENAI_TRANSCRIPTION_MODEL || "whisper-1",
        language: languageCodes[followUp.language],
        useRealtime: false,
      }),
      llm: new openai.LLM({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      }),
      tts: new openai.TTS({ voice: "alloy" }),
    });

    session.on(AgentSessionEventTypes.UserInputTranscribed, (event) => {
      if (!event.isFinal || !event.transcript.trim()) return;
      void publishTranscript(ctx, event.transcript.trim(), followUp.language);
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
    await ctx.connect();
    await session.generateReply({
      instructions: [
        `Ask this healthcare professional's question in ${language}:`,
        followUp.question,
        "Ask it once, faithfully. Then listen for the answer. Do not provide medical advice or add questions unless one neutral clarification is needed.",
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
