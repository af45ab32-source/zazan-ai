import { registerPlugin } from "@capacitor/core";

export interface ListenOptions {
  lang?: string;
}

export interface ListenResult {
  text: string;
  error?: "not-allowed" | "no-speech" | "not-supported" | "aborted" | string;
}

export interface VoiceAssistantPlugin {
  listen(options?: ListenOptions): Promise<ListenResult>;
}

export const VoiceAssistant = registerPlugin<VoiceAssistantPlugin>("VoiceAssistant", {
  web: () => ({
    async listen(options?: ListenOptions): Promise<ListenResult> {
      if (typeof window === "undefined") {
        return { text: "" };
      }

      // Check for browser speech recognition support
      const SpeechRecognition =
        (window as unknown as { SpeechRecognition?: any; webkitSpeechRecognition?: any })
          .SpeechRecognition ||
        (window as unknown as { SpeechRecognition?: any; webkitSpeechRecognition?: any })
          .webkitSpeechRecognition;

      if (!SpeechRecognition) {
        return {
          text: "",
          error: "not-supported",
        };
      }

      // Check mediaDevices permission safely if available
      if (navigator.mediaDevices?.getUserMedia) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          stream.getTracks().forEach((track) => track.stop());
        } catch (mediaErr: any) {
          const isNotAllowed =
            mediaErr?.name === "NotAllowedError" ||
            mediaErr?.name === "PermissionDeniedError" ||
            String(mediaErr?.message || "").toLowerCase().includes("permission");
          if (isNotAllowed) {
            return {
              text: "",
              error: "not-allowed",
            };
          }
        }
      }

      return new Promise<ListenResult>((resolve) => {
        let resolved = false;

        const finish = (result: ListenResult) => {
          if (!resolved) {
            resolved = true;
            resolve(result);
          }
        };

        try {
          const recognition = new SpeechRecognition();
          recognition.lang = options?.lang || "en-US";
          recognition.continuous = false;
          recognition.interimResults = false;
          recognition.maxAlternatives = 1;

          recognition.onresult = (event: any) => {
            const transcript = event.results?.[0]?.[0]?.transcript || "";
            finish({ text: transcript });
          };

          recognition.onerror = (event: any) => {
            const err = event.error || "Speech recognition error";
            if (err === "no-speech" || err === "aborted") {
              finish({ text: "" });
            } else if (err === "not-allowed" || err === "service-not-allowed") {
              finish({ text: "", error: "not-allowed" });
            } else {
              finish({ text: "", error: err });
            }
          };

          recognition.onnomatch = () => {
            finish({ text: "" });
          };

          recognition.onend = () => {
            finish({ text: "" });
          };

          recognition.start();
        } catch (e: any) {
          const errMsg = e instanceof Error ? e.message : String(e);
          finish({
            text: "",
            error: errMsg.includes("not-allowed") ? "not-allowed" : errMsg,
          });
        }
      });
    },
  }),
});
