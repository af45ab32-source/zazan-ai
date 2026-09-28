import { registerPlugin } from "@capacitor/core";

export interface VoiceActionsPlugin {
  openApp(options: { packageName: string }): Promise<{ success: boolean }>;
  openUrl(options: { url: string }): Promise<{ success: boolean }>;
  openCamera(): Promise<{ success: boolean }>;
  openMaps(options: { query?: string }): Promise<{ success: boolean }>;
  openYouTube(options: { query?: string }): Promise<{ success: boolean }>;
  openWhatsApp(options: { phone?: string; message?: string }): Promise<{ success: boolean }>;
}

export const VoiceActions = registerPlugin<VoiceActionsPlugin>("VoiceActions", {
  web: () => ({
    async openApp(options: { packageName: string }) {
      console.log("VoiceActions.openApp called on web:", options.packageName);
      const appMap: Record<string, string> = {
        "com.whatsapp": "https://web.whatsapp.com",
        "com.facebook.katana": "https://www.facebook.com",
        "com.zhiliaoapp.musically": "https://www.tiktok.com",
        "com.google.android.youtube": "https://www.youtube.com",
        "com.google.android.apps.maps": "https://maps.google.com",
      };
      const url = appMap[options.packageName] || `https://play.google.com/store/apps/details?id=${options.packageName}`;
      if (typeof window !== "undefined") {
        window.open(url, "_blank");
      }
      return { success: true };
    },

    async openUrl(options: { url: string }) {
      if (typeof window !== "undefined") {
        window.open(options.url, "_blank");
      }
      return { success: true };
    },

    async openCamera() {
      console.log("VoiceActions.openCamera called on web");
      if (typeof navigator !== "undefined" && navigator.mediaDevices?.getUserMedia) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true });
          // Stop stream right away after confirming camera access
          stream.getTracks().forEach((track) => track.stop());
          return { success: true };
        } catch {
          // Trigger file input dialog as fallback
          const input = document.createElement("input");
          input.type = "file";
          input.accept = "image/*";
          input.capture = "environment";
          input.click();
          return { success: true };
        }
      }
      return { success: false };
    },

    async openMaps(options: { query?: string }) {
      const q = encodeURIComponent(options.query || "");
      const url = q ? `https://www.google.com/maps/search/?api=1&query=${q}` : "https://www.google.com/maps";
      if (typeof window !== "undefined") {
        window.open(url, "_blank");
      }
      return { success: true };
    },

    async openYouTube(options: { query?: string }) {
      const q = encodeURIComponent(options.query || "");
      const url = q ? `https://www.youtube.com/results?search_query=${q}` : "https://www.youtube.com";
      if (typeof window !== "undefined") {
        window.open(url, "_blank");
      }
      return { success: true };
    },

    async openWhatsApp(options: { phone?: string; message?: string }) {
      const phone = encodeURIComponent(options.phone || "");
      const message = encodeURIComponent(options.message || "");
      const url = `https://api.whatsapp.com/send?phone=${phone}&text=${message}`;
      if (typeof window !== "undefined") {
        window.open(url, "_blank");
      }
      return { success: true };
    },
  }),
});
