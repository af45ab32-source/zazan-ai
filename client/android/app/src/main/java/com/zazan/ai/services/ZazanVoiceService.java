package com.zazan.ai.services;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.pm.ServiceInfo;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.provider.MediaStore;
import android.speech.RecognitionListener;
import android.speech.RecognizerIntent;
import android.speech.SpeechRecognizer;
import android.util.Log;
import android.widget.Toast;

import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;

import com.zazan.ai.MainActivity;
import com.zazan.ai.R;

import java.util.ArrayList;
import java.util.Locale;

public class ZazanVoiceService extends Service {

    private static final String TAG = "ZazanVoiceService";
    private static final String CHANNEL_ID = "zazan_voice_service_channel";
    private static final int NOTIFICATION_ID = 4001;

    public static final String ACTION_START = "com.zazan.ai.action.START_VOICE_SERVICE";
    public static final String ACTION_STOP = "com.zazan.ai.action.STOP_VOICE_SERVICE";
    public static final String BROADCAST_VOICE_COMMAND = "com.zazan.ai.VOICE_COMMAND_DETECTED";
    public static final String EXTRA_COMMAND_TEXT = "extra_command_text";

    private static boolean isServiceRunning = false;

    private SpeechRecognizer speechRecognizer;
    private Handler mainHandler;
    private boolean isListening = false;
    private String selectedLanguage = "en-US";

    public static boolean isRunning() {
        return isServiceRunning;
    }

    @Override
    public void onCreate() {
        super.onCreate();
        mainHandler = new Handler(Looper.getMainLooper());
        createNotificationChannel();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null && ACTION_STOP.equals(intent.getAction())) {
            stopVoiceService();
            return START_NOT_STICKY;
        }

        if (intent != null && intent.hasExtra("lang")) {
            String lang = intent.getStringExtra("lang");
            if (lang != null && !lang.isEmpty()) {
                selectedLanguage = lang;
            }
        }

        startForegroundServiceWithNotification();
        isServiceRunning = true;

        mainHandler.post(this::initSpeechRecognizerAndListen);

        return START_STICKY;
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    "Zazan Voice Assistant",
                    NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("Background voice assistance and command recognition");
            channel.setShowBadge(false);

            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(channel);
            }
        }
    }

    private void startForegroundServiceWithNotification() {
        Intent appIntent = new Intent(this, MainActivity.class);
        appIntent.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent contentPendingIntent = PendingIntent.getActivity(
                this,
                0,
                appIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? PendingIntent.FLAG_IMMUTABLE : 0)
        );

        Intent stopIntent = new Intent(this, ZazanVoiceService.class);
        stopIntent.setAction(ACTION_STOP);
        PendingIntent stopPendingIntent = PendingIntent.getService(
                this,
                1,
                stopIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? PendingIntent.FLAG_IMMUTABLE : 0)
        );

        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle("Zazan AI Voice Assistant")
                .setContentText("Listening for hands-free commands...")
                .setSmallIcon(R.mipmap.ic_launcher)
                .setContentIntent(contentPendingIntent)
                .setOngoing(true)
                .setPriority(NotificationCompat.PRIORITY_LOW)
                .addAction(android.R.drawable.ic_menu_close_clear_cancel, "Stop Assistant", stopPendingIntent);

        Notification notification = builder.build();

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(
                    NOTIFICATION_ID,
                    notification,
                    ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE
            );
        } else {
            startForeground(NOTIFICATION_ID, notification);
        }
    }

    private void initSpeechRecognizerAndListen() {
        if (!SpeechRecognizer.isRecognitionAvailable(this)) {
            Log.w(TAG, "SpeechRecognizer is not available on this device.");
            return;
        }

        cleanupSpeechRecognizer();

        try {
            speechRecognizer = SpeechRecognizer.createSpeechRecognizer(this);
            speechRecognizer.setRecognitionListener(new RecognitionListener() {
                @Override
                public void onReadyForSpeech(Bundle params) {
                    isListening = true;
                }

                @Override
                public void onBeginningOfSpeech() {}

                @Override
                public void onRmsChanged(float rmsdB) {}

                @Override
                public void onBufferReceived(byte[] buffer) {}

                @Override
                public void onEndOfSpeech() {
                    isListening = false;
                }

                @Override
                public void onError(int error) {
                    isListening = false;
                    Log.d(TAG, "Speech recognition error code: " + error);

                    if (isServiceRunning) {
                        // Short backoff before listening again
                        mainHandler.postDelayed(() -> {
                            if (isServiceRunning) {
                                startListeningInternal();
                            }
                        }, 500);
                    }
                }

                @Override
                public void onResults(Bundle results) {
                    isListening = false;
                    ArrayList<String> matches = results.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
                    if (matches != null && !matches.isEmpty()) {
                        String recognizedText = matches.get(0);
                        Log.i(TAG, "Recognized background command: " + recognizedText);
                        handleRecognizedSpeech(recognizedText);
                    }

                    if (isServiceRunning) {
                        mainHandler.postDelayed(() -> {
                            if (isServiceRunning) {
                                startListeningInternal();
                            }
                        }, 600);
                    }
                }

                @Override
                public void onPartialResults(Bundle partialResults) {}

                @Override
                public void onEvent(int eventType, Bundle params) {}
            });

            startListeningInternal();
        } catch (Exception e) {
            Log.e(TAG, "Failed to initialize SpeechRecognizer in foreground service", e);
        }
    }

    private void startListeningInternal() {
        if (!isServiceRunning || speechRecognizer == null) return;

        try {
            Intent recognizerIntent = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
            recognizerIntent.putExtra(
                    RecognizerIntent.EXTRA_LANGUAGE_MODEL,
                    RecognizerIntent.LANGUAGE_MODEL_FREE_FORM
            );
            recognizerIntent.putExtra(RecognizerIntent.EXTRA_LANGUAGE, selectedLanguage);
            recognizerIntent.putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, false);
            recognizerIntent.putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 1);

            speechRecognizer.startListening(recognizerIntent);
        } catch (Exception e) {
            Log.e(TAG, "Exception starting listening in service", e);
        }
    }

    private void handleRecognizedSpeech(String speechText) {
        String lower = speechText.trim().toLowerCase(Locale.ROOT);

        // 1. Check if user wants to stop background assistant
        if (lower.equals("stop listening") || lower.equals("stop assistant") || lower.equals("turn off assistant") || lower.equals("exit assistant")) {
            Toast.makeText(this, "Zazan AI: Stopped listening", Toast.LENGTH_SHORT).show();
            stopVoiceService();
            return;
        }

        // 2. Direct native app actions
        boolean handledNatively = executeNativeVoiceCommand(lower);

        // 3. Broadcast to frontend activity / web app so chat or UI updates
        Intent broadcast = new Intent(BROADCAST_VOICE_COMMAND);
        broadcast.putExtra(EXTRA_COMMAND_TEXT, speechText);
        broadcast.setPackage(getPackageName());
        sendBroadcast(broadcast);

        if (!handledNatively) {
            Log.d(TAG, "Broadcasted voice command to Zazan app: " + speechText);
        }
    }

    private boolean executeNativeVoiceCommand(String cmd) {
        // WhatsApp
        if (cmd.contains("open whatsapp") || cmd.equals("whatsapp") || cmd.contains("launch whatsapp")) {
            return launchAppByPackage(new String[]{"com.whatsapp", "com.whatsapp.w4b"}, "WhatsApp");
        }

        // YouTube
        if (cmd.contains("open youtube") || cmd.equals("youtube") || cmd.contains("launch youtube")) {
            return launchAppByPackage(new String[]{"com.google.android.youtube"}, "YouTube");
        }
        if (cmd.startsWith("search youtube for ") || cmd.startsWith("youtube ")) {
            String query = cmd.replaceFirst("^(search youtube for|youtube)\\s+", "");
            try {
                Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse("https://www.youtube.com/results?search_query=" + Uri.encode(query)));
                intent.setPackage("com.google.android.youtube");
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                startActivity(intent);
                Toast.makeText(this, "Opening YouTube for: " + query, Toast.LENGTH_SHORT).show();
                return true;
            } catch (Exception e) {
                return launchWebUrl("https://www.youtube.com/results?search_query=" + Uri.encode(query), "YouTube");
            }
        }

        // Facebook
        if (cmd.contains("open facebook") || cmd.equals("facebook") || cmd.contains("launch facebook")) {
            return launchAppByPackage(new String[]{"com.facebook.katana", "com.facebook.lite"}, "Facebook");
        }

        // TikTok
        if (cmd.contains("open tiktok") || cmd.equals("tiktok") || cmd.contains("launch tiktok")) {
            return launchAppByPackage(new String[]{"com.zhiliaoapp.musically", "com.zhiliaoapp.musically.go", "com.ss.android.ugc.trill"}, "TikTok");
        }

        // Camera
        if (cmd.equals("open camera") || cmd.contains("camera") || cmd.contains("take a picture") || cmd.contains("take picture")) {
            try {
                Intent intent = new Intent(MediaStore.ACTION_IMAGE_CAPTURE);
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                startActivity(intent);
                Toast.makeText(this, "Opening Camera", Toast.LENGTH_SHORT).show();
                return true;
            } catch (Exception e) {
                Log.e(TAG, "Failed to open camera", e);
                return false;
            }
        }

        // Maps
        if (cmd.contains("open maps") || cmd.contains("open google maps") || cmd.equals("maps")) {
            return launchAppByPackage(new String[]{"com.google.android.apps.maps"}, "Google Maps");
        }
        if (cmd.startsWith("directions to ") || cmd.startsWith("navigate to ") || cmd.startsWith("maps ")) {
            String query = cmd.replaceFirst("^(directions to|navigate to|maps)\\s+", "");
            try {
                Uri gmmIntentUri = Uri.parse("geo:0,0?q=" + Uri.encode(query));
                Intent mapIntent = new Intent(Intent.ACTION_VIEW, gmmIntentUri);
                mapIntent.setPackage("com.google.android.apps.maps");
                mapIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                startActivity(mapIntent);
                Toast.makeText(this, "Navigating to: " + query, Toast.LENGTH_SHORT).show();
                return true;
            } catch (Exception e) {
                return launchWebUrl("https://maps.google.com/?q=" + Uri.encode(query), "Google Maps");
            }
        }

        return false;
    }

    private boolean launchAppByPackage(String[] packages, String appName) {
        PackageManager pm = getPackageManager();
        for (String pkg : packages) {
            try {
                Intent launchIntent = pm.getLaunchIntentForPackage(pkg);
                if (launchIntent != null) {
                    launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    startActivity(launchIntent);
                    Toast.makeText(this, "Opening " + appName, Toast.LENGTH_SHORT).show();
                    return true;
                }
            } catch (Exception e) {
                Log.w(TAG, "Could not launch package " + pkg, e);
            }
        }

        Toast.makeText(this, appName + " is not installed", Toast.LENGTH_SHORT).show();
        return false;
    }

    private boolean launchWebUrl(String url, String title) {
        try {
            Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            startActivity(intent);
            return true;
        } catch (Exception e) {
            Log.e(TAG, "Could not open fallback URL for " + title, e);
            return false;
        }
    }

    private void stopVoiceService() {
        isServiceRunning = false;
        cleanupSpeechRecognizer();
        stopForeground(true);
        stopSelf();
    }

    private void cleanupSpeechRecognizer() {
        if (speechRecognizer != null) {
            try {
                speechRecognizer.stopListening();
                speechRecognizer.cancel();
                speechRecognizer.destroy();
            } catch (Exception e) {
                Log.w(TAG, "Error cleaning up SpeechRecognizer", e);
            }
            speechRecognizer = null;
        }
    }

    @Override
    public void onDestroy() {
        isServiceRunning = false;
        cleanupSpeechRecognizer();
        super.onDestroy();
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
