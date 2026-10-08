import type { IntakeChatMessage } from "./aiIntake";
import { Types } from "mongoose";
import { AISummary } from "../models/AISummary.model";

export function appendIntakeTurn(
  existing: IntakeChatMessage[],
  patientMessage: string,
  assistantMessage: string,
) {
  return [
    ...existing,
    { role: "user" as const, content: patientMessage },
    { role: "assistant" as const, content: assistantMessage },
  ];
}

export async function persistIntakeSummary(
  caseId: Types.ObjectId,
  fallbackConversation: IntakeChatMessage[],
  patientMessage: string,
  assistantMessage: string,
  summaryData: Record<string, unknown>,
) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const latest = await AISummary.findOne({ caseId }).sort({ version: -1 });
    const existingConversation =
      latest?.data.conversationSource === "server-generated-v1" &&
      Array.isArray(latest.data.conversation)
        ? (latest.data.conversation as IntakeChatMessage[])
        : fallbackConversation;
    if (latest?.data.conversationSource === "server-generated-v1") {
      const existingAssistantMessages = new Set(
        existingConversation
          .filter((message) => message.role === "assistant")
          .map((message) => message.content),
      );
      for (const message of fallbackConversation) {
        if (
          message.role === "assistant" &&
          !existingAssistantMessages.has(message.content)
        ) {
          existingConversation.push(message);
          existingAssistantMessages.add(message.content);
        }
      }
    }
    try {
      return await AISummary.create({
        caseId,
        version: (latest?.version || 0) + 1,
        data: {
          ...summaryData,
          conversation: appendIntakeTurn(
            existingConversation,
            patientMessage,
            assistantMessage,
          ),
        },
      });
    } catch (error) {
      if ((error as { code?: number })?.code !== 11000 || attempt === 4) {
        throw error;
      }
    }
  }
  throw new Error("Unable to save the intake summary. Please try again.");
}
