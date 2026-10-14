import { registerPlugin, type PluginListenerHandle } from "@capacitor/core";

export interface ListenOptions {
  lang?: string;
}

export interface ListenResult {
  text: string;
  error?: "not-allowed" | "no-speech" | "not-supported" | "aborted" | string;
  message?: string;
}

export interface MicrophoneStatus {
  granted: boolean;
  state: "granted" | "denied" | "prompt" | "not-supported" | string;
  message?: string;
}

export interface ContinuousAssistantResult {
  success: boolean;
  running: boolean;
  message?: string;
  error?: string;
}

export interface VoiceAssistantPlugin {
  listen(options?: ListenOptions): Promise<ListenResult>;
  checkMicrophonePermission(): Promise<MicrophoneStatus>;
  requestMicrophonePermission(): Promise<MicrophoneStatus>;
  openAppSettings(): Promise<{ success: boolean; message?: string }>;
  startContinuousListening(options?: { lang?: string }): Promise<ContinuousAssistantResult>;
  stopContinuousListening(): Promise<ContinuousAssistantResult>;
  isContinuousListeningActive(): Promise<{ active: boolean }>;
  addListener(
    eventName: "onVoiceCommand",
    listenerFunc: (data: { text: string }) => void
  ): Promise<PluginListenerHandle> & PluginListenerHandle;
}

export const VoiceAssistant = registerPlugin<VoiceAssistantPlugin>("VoiceAssistant", {
  web: () => {
    let continuousActive = false;
    let webRecognition: any = null;
    const listeners: Array<(data: { text: string }) => void> = [];

    return {
      async checkMicrophonePermission(): Promise<MicrophoneStatus> {
        if (typeof window === "undefined") {
          return { granted: false, state: "not-supported" };
        }

        if (navigator.permissions && navigator.permissions.query) {
          try {
            const perm = await navigator.permissions.query({ name: "microphone" as PermissionName });
            return {
              granted: perm.state === "granted",
              state: perm.state,
            };
          } catch {
            // Some browsers throw on querying microphone permission
          }
        }

        if (!navigator.mediaDevices?.getUserMedia) {
          return { granted: false, state: "not-supported", message: "MediaDevices API not supported." };
        }

        return { granted: false, state: "prompt" };
      },

      async requestMicrophonePermission(): Promise<MicrophoneStatus> {
        if (typeof window === "undefined" || !navigator.mediaDevices?.getUserMedia) {
          return {
            granted: false,
            state: "not-supported",
            message: "Microphone access is not supported by your browser environment.",
          };
        }

        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          stream.getTracks().forEach((track) => track.stop());
          return {
            granted: true,
            state: "granted",
            message: "Microphone access granted.",
          };
        } catch (err: any) {
          const isDenied =
            err?.name === "NotAllowedError" ||
            err?.name === "PermissionDeniedError" ||
            String(err?.message || "").toLowerCase().includes("denied") ||
            String(err?.message || "").toLowerCase().includes("permission");

          return {
            granted: false,
            state: isDenied ? "denied" : "prompt",
            message: isDenied
              ? "Microphone access was denied. Please allow microphone permissions in your browser or device settings."
              : err?.message || "Failed to access microphone.",
          };
        }
      },

      async openAppSettings(): Promise<{ success: boolean; message?: string }> {
        return {
          success: false,
          message: "On web browsers, click the lock or tuning icon next to the URL in your address bar to manage microphone permissions.",
        };
      },

      async startContinuousListening(options?: { lang?: string }): Promise<ContinuousAssistantResult> {
        if (typeof window === "undefined") {
          return { success: false, running: false, error: "Window undefined" };
        }

        const SpeechRecognition =
          (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

        if (!SpeechRecognition) {
          return {
            success: false,
            running: false,
            error: "Web Speech API is not supported in this browser environment.",
          };
        }

        try {
          continuousActive = true;
          webRecognition = new SpeechRecognition();
          webRecognition.continuous = true;
          webRecognition.interimResults = false;
          webRecognition.lang = options?.lang || "en-US";

          webRecognition.onresult = (event: any) => {
            const last = event.results.length - 1;
            const transcript = event.results[last][0].transcript.trim();
            if (transcript) {
              listeners.forEach((fn) => fn({ text: transcript }));
            }
          };

          webRecognition.onend = () => {
            if (continuousActive && webRecognition) {
              try {
                webRecognition.start();
              } catch (e) {
                console.warn("Could not restart web speech", e);
              }
            }
          };

          webRecognition.start();
          return { success: true, running: true, message: "Continuous web listening active." };
        } catch (err: any) {
          continuousActive = false;
          return { success: false, running: false, error: err?.message || String(err) };
        }
      },

      async stopContinuousListening(): Promise<ContinuousAssistantResult> {
        continuousActive = false;
        if (webRecognition) {
          try {
            webRecognition.stop();
          } catch {}
          webRecognition = null;
        }
        return { success: true, running: false, message: "Continuous web listening stopped." };
      },

      async isContinuousListeningActive(): Promise<{ active: boolean }> {
        return { active: continuousActive };
      },

      async addListener(
        eventName: "onVoiceCommand",
        listenerFunc: (data: { text: string }) => void
      ): Promise<PluginListenerHandle> {
        listeners.push(listenerFunc);
        return {
          remove: async () => {
            const idx = listeners.indexOf(listenerFunc);
            if (idx !== -1) listeners.splice(idx, 1);
          },
        };
      },

      async listen(options?: ListenOptions): Promise<ListenResult> {
        if (typeof window === "undefined") {
          return { text: "" };
        }

        const SpeechRecognition =
          (window as unknown as { SpeechRecognition?: any; webkitSpeechRecognition?: any })
            .SpeechRecognition ||
          (window as unknown as { SpeechRecognition?: any; webkitSpeechRecognition?: any })
            .webkitSpeechRecognition;

        if (!SpeechRecognition) {
          return {
            text: "",
            error: "not-supported",
            message: "Voice speech recognition is not supported in this browser.",
          };
        }

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
                message: "Microphone permission was denied.",
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
                finish({
                  text: "",
                  error: "not-allowed",
                  message: "Microphone access is blocked or not permitted.",
                });
              } else {
                finish({ text: "", error: err });
              }
            };

            recognition.onnomatch = () => finish({ text: "" });
            recognition.onend = () => finish({ text: "" });

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
    };
  },
});
