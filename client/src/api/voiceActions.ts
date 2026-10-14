import { registerPlugin } from "@capacitor/core";

export interface VoiceActionResult {
  success: boolean;
  installed?: boolean;
  opened?: boolean;
  packageName?: string;
  message?: string;
  error?: string;
}

export interface VoiceActionsPlugin {
  openApp(options: { packageName: string; openStoreIfMissing?: boolean }): Promise<VoiceActionResult>;
  isAppInstalled(options: { packageName: string }): Promise<{ installed: boolean; resolvedPackage?: string }>;
  openUrl(options: { url: string }): Promise<{ success: boolean; error?: string }>;
  openCamera(): Promise<{ success: boolean; error?: string }>;
  openMaps(options: { query?: string }): Promise<{ success: boolean; error?: string }>;
  openYouTube(options: { query?: string }): Promise<{ success: boolean; installed?: boolean; error?: string }>;
  openWhatsApp(options: { phone?: string; message?: string }): Promise<{ success: boolean; installed?: boolean; error?: string }>;
  openFacebook(): Promise<{ success: boolean; installed?: boolean; error?: string }>;
  openTikTok(): Promise<{ success: boolean; installed?: boolean; error?: string }>;
}

export const VoiceActions = registerPlugin<VoiceActionsPlugin>("VoiceActions", {
  web: () => ({
    async openApp(options: { packageName: string; openStoreIfMissing?: boolean }): Promise<VoiceActionResult> {
      console.log("VoiceActions.openApp called on web:", options.packageName);
      const appMap: Record<string, string> = {
        "com.whatsapp": "https://web.whatsapp.com",
        "com.whatsapp.w4b": "https://web.whatsapp.com",
        "com.facebook.katana": "https://www.facebook.com",
        "com.facebook.lite": "https://www.facebook.com",
        "com.zhiliaoapp.musically": "https://www.tiktok.com",
        "com.zhiliaoapp.musically.go": "https://www.tiktok.com",
        "com.ss.android.ugc.trill": "https://www.tiktok.com",
        "com.google.android.youtube": "https://www.youtube.com",
        "com.google.android.apps.maps": "https://maps.google.com",
        "com.instagram.android": "https://www.instagram.com",
      };
      const url = appMap[options.packageName] || `https://play.google.com/store/apps/details?id=${options.packageName}`;
      if (typeof window !== "undefined") {
        window.open(url, "_blank");
      }
      return { success: true, opened: true, installed: true };
    },

    async isAppInstalled(options: { packageName: string }) {
      return { installed: false, resolvedPackage: options.packageName };
    },

    async openUrl(options: { url: string }) {
      if (typeof window !== "undefined") {
        window.open(options.url, "_blank");
      }
      return { success: true };
    },

    async openCamera() {
      if (typeof navigator !== "undefined" && navigator.mediaDevices?.getUserMedia) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true });
          stream.getTracks().forEach((track) => track.stop());
          return { success: true };
        } catch {
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
      return { success: true, installed: false };
    },

    async openWhatsApp(options: { phone?: string; message?: string }) {
      const phone = encodeURIComponent(options.phone || "");
      const message = encodeURIComponent(options.message || "");
      const url = `https://api.whatsapp.com/send?phone=${phone}&text=${message}`;
      if (typeof window !== "undefined") {
        window.open(url, "_blank");
      }
      return { success: true, installed: false };
    },

    async openFacebook() {
      if (typeof window !== "undefined") {
        window.open("https://www.facebook.com", "_blank");
      }
      return { success: true, installed: false };
    },

    async openTikTok() {
      if (typeof window !== "undefined") {
        window.open("https://www.tiktok.com", "_blank");
      }
      return { success: true, installed: false };
    },
  }),
});
