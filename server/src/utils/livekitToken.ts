import jwt from "jsonwebtoken";
import { createHash } from "node:crypto";

const TOKEN_TTL_SECONDS = 5 * 60;

export type FollowUpRoomTokenInput = {
  userId: string;
  questionId: string;
  language: string;
  now?: number;
};

export type FollowUpRoomToken = {
  url: string;
  token: string;
  roomName: string;
  expiresAt: string;
};

export function createFollowUpRoomToken(input: FollowUpRoomTokenInput): FollowUpRoomToken {
  const url = process.env.LIVEKIT_URL?.trim();
  const apiKey = process.env.LIVEKIT_API_KEY?.trim();
  const apiSecret = process.env.LIVEKIT_API_SECRET?.trim();
  const agentName = process.env.LIVEKIT_AGENT_NAME?.trim() || "sehatsetu-followup-agent";
  if (!url || !apiKey || !apiSecret) {
    throw new Error("LiveKit is not configured. Text answers remain available.");
  }

  const parsedUrl = new URL(url);
  if (!["wss:", "ws:"].includes(parsedUrl.protocol) || parsedUrl.username || parsedUrl.password) {
    throw new Error("LIVEKIT_URL must be a valid ws:// or wss:// URL.");
  }
  if (process.env.NODE_ENV === "production" && parsedUrl.protocol !== "wss:") {
    throw new Error("LIVEKIT_URL must use wss:// in production.");
  }
  if (!input.userId || !input.questionId) throw new Error("Voice session authorization context is missing.");

  const now = Math.floor((input.now ?? Date.now()) / 1000);
  const roomName = `ss-followup-${input.questionId}`;
  const identitySuffix = createHash("sha256").update(input.userId).digest("hex").slice(0, 20);
  const claims = {
    iss: apiKey,
    sub: `patient-${identitySuffix}`,
    name: "SehatSetu patient",
    nbf: now - 5,
    exp: now + TOKEN_TTL_SECONDS,
    video: {
      room: roomName,
      roomJoin: true,
      canPublish: true,
      canPublishSources: ["microphone"],
      canPublishData: false,
      canSubscribe: true,
    },
    roomConfig: {
      agents: [{
        agentName,
        metadata: JSON.stringify({
          workflow: "doctor-follow-up",
          questionId: input.questionId,
          language: input.language,
        }),
      }],
    },
  };
  const token = jwt.sign(claims, apiSecret, { algorithm: "HS256" });
  return {
    url,
    token,
    roomName,
    expiresAt: new Date((now + TOKEN_TTL_SECONDS) * 1000).toISOString(),
  };
}
