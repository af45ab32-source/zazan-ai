import { registerPlugin } from "@capacitor/core";

export interface VoiceAssistantPlugin {
  listen(): Promise<{ text: string }>;
}

export const VoiceAssistant =
  registerPlugin<VoiceAssistantPlugin>("VoiceAssistant");
