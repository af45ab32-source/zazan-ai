import { VoiceActions } from "./voiceActions";
import type { ZazanMode } from "./client";

export type CommandType =
  | "native_action"
  | "assistant_control"
  | "mode_switch"
  | "ai_chat";

export interface RoutedCommand {
  type: CommandType;
  action?: string;
  target?: string;
  query?: string;
  feedbackMessage?: string;
}

export function classifyVoiceCommand(input: string): RoutedCommand {
  const text = input.trim();
  const lower = text.toLowerCase();

  // 1. Assistant Controls
  if (
    lower === "stop listening" ||
    lower === "stop assistant" ||
    lower === "turn off assistant" ||
    lower === "disable assistant" ||
    lower === "exit assistant"
  ) {
    return {
      type: "assistant_control",
      action: "stop_listening",
      feedbackMessage: "Stopping voice assistant.",
    };
  }

  if (
    lower === "start listening" ||
    lower === "start assistant" ||
    lower === "enable assistant" ||
    lower === "continuous listening"
  ) {
    return {
      type: "assistant_control",
      action: "start_listening",
      feedbackMessage: "Starting continuous voice assistant.",
    };
  }

  if (lower === "turn off speech" || lower === "mute speech" || lower === "disable voice output") {
    return {
      type: "assistant_control",
      action: "disable_tts",
      feedbackMessage: "Voice speech output turned off.",
    };
  }

  if (lower === "turn on speech" || lower === "unmute speech" || lower === "enable voice output") {
    return {
      type: "assistant_control",
      action: "enable_tts",
      feedbackMessage: "Voice speech output enabled.",
    };
  }

  if (lower === "clear chat" || lower === "clear messages") {
    return {
      type: "assistant_control",
      action: "clear_chat",
      feedbackMessage: "Chat cleared.",
    };
  }

  if (lower === "new chat" || lower === "new conversation") {
    return {
      type: "assistant_control",
      action: "new_chat",
      feedbackMessage: "Started new conversation.",
    };
  }

  // 2. Mode Switches
  const modePatterns: Array<{ regex: RegExp; mode: ZazanMode; label: string }> = [
    { regex: /^(switch to\s+)?islamic(\s+mode)?$/i, mode: "islamic", label: "Islamic Guidance" },
    { regex: /^(switch to\s+)?coding(\s+mode)?$/i, mode: "coding", label: "Coding & Engineering" },
    { regex: /^(switch to\s+)?study(\s+mode)?$/i, mode: "study", label: "Study & Academic" },
    { regex: /^(switch to\s+)?translator(\s+mode)?$/i, mode: "translator", label: "Translator" },
    { regex: /^(switch to\s+)?summarizer(\s+mode)?$/i, mode: "summarizer", label: "Summarizer" },
    { regex: /^(switch to\s+)?research(\s+mode)?$/i, mode: "research", label: "In-Depth Research" },
    { regex: /^(switch to\s+)?general(\s+mode)?$/i, mode: "general", label: "General Assistant" },
  ];

  for (const p of modePatterns) {
    if (p.regex.test(lower)) {
      return {
        type: "mode_switch",
        target: p.mode,
        feedbackMessage: `Switched mode to ${p.label}.`,
      };
    }
  }

  // 3. Native App Actions
  // YouTube
  if (lower === "open youtube" || lower === "youtube" || lower === "launch youtube") {
    return {
      type: "native_action",
      action: "open_youtube",
      target: "YouTube",
      feedbackMessage: "Opening YouTube...",
    };
  }

  if (lower.startsWith("search youtube for ") || lower.startsWith("youtube ")) {
    const q = text.replace(/^(search youtube for|youtube)\s+/i, "").trim();
    return {
      type: "native_action",
      action: "search_youtube",
      target: "YouTube",
      query: q,
      feedbackMessage: `Searching YouTube for "${q}"...`,
    };
  }

  // WhatsApp
  if (lower === "open whatsapp" || lower === "whatsapp" || lower === "launch whatsapp") {
    return {
      type: "native_action",
      action: "open_whatsapp",
      target: "WhatsApp",
      feedbackMessage: "Opening WhatsApp...",
    };
  }

  // Facebook
  if (lower === "open facebook" || lower === "facebook" || lower === "launch facebook") {
    return {
      type: "native_action",
      action: "open_facebook",
      target: "Facebook",
      feedbackMessage: "Opening Facebook...",
    };
  }

  // TikTok
  if (lower === "open tiktok" || lower === "tiktok" || lower === "launch tiktok") {
    return {
      type: "native_action",
      action: "open_tiktok",
      target: "TikTok",
      feedbackMessage: "Opening TikTok...",
    };
  }

  // Camera
  if (
    lower === "open camera" ||
    lower === "camera" ||
    lower === "take picture" ||
    lower === "take a picture" ||
    lower === "take a photo"
  ) {
    return {
      type: "native_action",
      action: "open_camera",
      target: "Camera",
      feedbackMessage: "Opening Camera...",
    };
  }

  // Maps & Navigation
  if (lower === "open maps" || lower === "open google maps" || lower === "maps") {
    return {
      type: "native_action",
      action: "open_maps",
      target: "Google Maps",
      feedbackMessage: "Opening Maps...",
    };
  }

  if (lower.startsWith("directions to ") || lower.startsWith("navigate to ") || lower.startsWith("maps ")) {
    const q = text.replace(/^(directions to|navigate to|maps)\s+/i, "").trim();
    return {
      type: "native_action",
      action: "navigate_maps",
      target: "Google Maps",
      query: q,
      feedbackMessage: `Navigating to ${q}...`,
    };
  }

  // Generic "open [app]" pattern
  const openAppMatch = lower.match(/^open\s+([a-z0-9_\-\.\s]+)$/i);
  if (openAppMatch && openAppMatch[1]) {
    const rawAppName = openAppMatch[1].trim();
    const appPackages: Record<string, string> = {
      whatsapp: "com.whatsapp",
      facebook: "com.facebook.katana",
      tiktok: "com.zhiliaoapp.musically",
      youtube: "com.google.android.youtube",
      instagram: "com.instagram.android",
      camera: "camera",
      maps: "com.google.android.apps.maps",
    };

    if (appPackages[rawAppName]) {
      return {
        type: "native_action",
        action: "open_app",
        target: appPackages[rawAppName],
        feedbackMessage: `Opening ${rawAppName}...`,
      };
    }
  }

  // 4. Default: AI Chat
  return {
    type: "ai_chat",
    query: text,
  };
}

export async function executeNativeAction(command: RoutedCommand): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    switch (command.action) {
      case "open_youtube": {
        const res = await VoiceActions.openYouTube({});
        return {
          success: res.success,
          message: res.success ? "Opened YouTube." : "Could not open YouTube app.",
        };
      }

      case "search_youtube": {
        const res = await VoiceActions.openYouTube({ query: command.query });
        return {
          success: res.success,
          message: res.success ? `Opened YouTube for "${command.query}".` : "Could not open YouTube.",
        };
      }

      case "open_whatsapp": {
        const res = await VoiceActions.openWhatsApp({});
        return {
          success: res.success,
          message: res.success ? "Opened WhatsApp." : "WhatsApp is not installed.",
        };
      }

      case "open_facebook": {
        const res = await VoiceActions.openFacebook();
        return {
          success: res.success,
          message: res.success ? "Opened Facebook." : "Facebook is not installed.",
        };
      }

      case "open_tiktok": {
        const res = await VoiceActions.openTikTok();
        return {
          success: res.success,
          message: res.success ? "Opened TikTok." : "TikTok is not installed.",
        };
      }

      case "open_camera": {
        const res = await VoiceActions.openCamera();
        return {
          success: res.success,
          message: res.success ? "Camera launched." : "Could not open camera.",
        };
      }

      case "open_maps": {
        const res = await VoiceActions.openMaps({});
        return {
          success: res.success,
          message: res.success ? "Opened Maps." : "Could not open Google Maps.",
        };
      }

      case "navigate_maps": {
        const res = await VoiceActions.openMaps({ query: command.query });
        return {
          success: res.success,
          message: res.success ? `Navigating to ${command.query}.` : "Could not open Maps.",
        };
      }

      case "open_app": {
        if (!command.target) return { success: false, message: "No package specified." };
        const res = await VoiceActions.openApp({ packageName: command.target, openStoreIfMissing: true });
        return {
          success: res.success,
          message: res.success ? "Application launched." : (res.message || "App is not installed on this device."),
        };
      }

      default:
        return { success: false, message: "Unknown action." };
    }
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || "Failed to execute voice action.",
    };
  }
}
