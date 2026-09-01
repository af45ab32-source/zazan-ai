import { registerPlugin } from "@capacitor/core";

export interface VoiceActionsPlugin {
  openApp(options: { packageName: string }): Promise<{ success: boolean }>;
  openUrl(options: { url: string }): Promise<{ success: boolean }>;
}

export const VoiceActions =
  registerPlugin<VoiceActionsPlugin>("VoiceActions");
