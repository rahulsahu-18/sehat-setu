const languageCodes: Record<string, string> = {
  english: "en",
  hindi: "hi",
  odia: "or",
};

const languagePrompts: Record<string, string> = {
  english:
    "Transcribe the speech in English. Preserve the words spoken; do not interpret or add information.",
  hindi:
    "Transcribe the speech in Hindi using Devanagari script. Preserve the words spoken; do not translate, interpret, or add information.",
  odia:
    "Transcribe the speech in Odia (ଓଡ଼ିଆ) using Odia script. Preserve the words spoken; do not translate, interpret, or add information.",
};

const extensionsByMimeType: Record<string, string> = {
  "audio/aac": "aac",
  "audio/flac": "flac",
  "audio/mp4": "mp4",
  "audio/mpeg": "mp3",
  "audio/ogg": "ogg",
  "audio/wav": "wav",
  "audio/webm": "webm",
  "audio/x-m4a": "m4a",
  "audio/x-wav": "wav",
};

export const SUPPORTED_VOICE_MIME_TYPES = new Set(
  Object.keys(extensionsByMimeType),
);
export const MAX_VOICE_UPLOAD_BYTES = 10 * 1024 * 1024;

export async function transcribeIntakeAudio(
  language: string,
  audio: Buffer,
  mimeType: string,
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error(
      "AI intake is not configured. Set OPENAI_API_KEY on the server.",
    );
  }

  const languageCode = languageCodes[language];
  if (!languageCode) {
    throw new Error("Voice transcription is not supported for this language.");
  }

  const normalizedMimeType = mimeType.split(";")[0]?.trim().toLowerCase();
  const extension = normalizedMimeType
    ? extensionsByMimeType[normalizedMimeType]
    : undefined;
  if (!normalizedMimeType || !extension || audio.length === 0) {
    throw new Error("Record a supported audio format before transcribing.");
  }

  const form = new FormData();
  form.append(
    "file",
    new Blob([new Uint8Array(audio)], { type: normalizedMimeType }),
    `intake.${extension}`,
  );
  form.append(
    "model",
    process.env.OPENAI_TRANSCRIPTION_MODEL?.trim() || "whisper-1",
  );
  form.append("language", languageCode);
  form.append(
    "prompt",
    `Transcribe a patient's healthcare intake statement accurately. ${languagePrompts[language]}`,
  );

  let response: Response;
  try {
    response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      signal: AbortSignal.timeout(90000),
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError") {
      throw new Error("Voice transcription timed out. Please try again.");
    }
    throw new Error(
      "Voice transcription is temporarily unavailable. Please try again.",
    );
  }

  if (!response.ok) {
    let providerError = "";
    try {
      const payload: {
        error?: { message?: unknown; code?: unknown; type?: unknown };
      } = await response.json();
      const error = payload.error;
      if (error && typeof error === "object") {
        providerError = [
          error.message,
          error.code,
          error.type,
        ]
          .filter((value): value is string => typeof value === "string")
          .join(" ")
          .toLowerCase();
      }
    } catch {
      // Fall through to the status-based error below for non-JSON responses.
    }

    switch (response.status) {
      case 401:
        throw new Error(
          "The AI assistant rejected the server API key. Check OPENAI_API_KEY.",
        );
      case 403:
        throw new Error(
          "The AI service account does not have access to voice transcription.",
        );
      case 429:
        throw new Error(
          "The AI service is rate-limited or out of quota. Try again later.",
        );
      default:
        if (response.status >= 500) {
          throw new Error(
            "Voice transcription is temporarily unavailable. Please try again.",
          );
        }
        if (/language|unsupported_value/.test(providerError)) {
          throw new Error(
            `Voice transcription does not support ${language} with the configured model. Choose whisper-1 or type your message.`,
          );
        }
        throw new Error(
          `Voice transcription was rejected by the service (HTTP ${response.status}). Try a short recording in a supported audio format; if this continues, check the server's transcription model and account access.`,
        );
    }
  }

  let payload: { text?: unknown };
  try {
    payload = (await response.json()) as typeof payload;
  } catch {
    throw new Error("Voice transcription returned an invalid response.");
  }
  if (typeof payload.text !== "string" || !payload.text.trim()) {
    throw new Error(
      "No speech was detected. Try again in a quieter place or type your message.",
    );
  }
  if (payload.text.length > 4000) {
    throw new Error(
      "The transcript is too long. Please record a shorter message.",
    );
  }
  return payload.text.trim();
}
