package com.zazan.ai.plugins;

import android.Manifest;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.provider.Settings;
import android.speech.RecognizerIntent;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.PermissionState;

import java.util.ArrayList;

@CapacitorPlugin(
    name = "VoiceAssistant",
    permissions = {
        @Permission(
            alias = "microphone",
            strings = { Manifest.permission.RECORD_AUDIO }
        )
    }
)
public class VoiceAssistantPlugin extends Plugin {

    private static final int SPEECH_REQUEST = 9001;
    private PluginCall pendingCall;

    @PluginMethod
    public void checkMicrophonePermission(PluginCall call) {
        JSObject ret = new JSObject();
        boolean granted = getPermissionState("microphone") == PermissionState.GRANTED;
        ret.put("granted", granted);
        ret.put("state", getPermissionState("microphone").toString());
        call.resolve(ret);
    }

    @PluginMethod
    public void requestMicrophonePermission(PluginCall call) {
        if (getPermissionState("microphone") == PermissionState.GRANTED) {
            JSObject ret = new JSObject();
            ret.put("granted", true);
            ret.put("state", "GRANTED");
            call.resolve(ret);
            return;
        }
        requestPermissionForAlias("microphone", call, "microphonePermissionOnlyCallback");
    }

    @PermissionCallback
    public void microphonePermissionOnlyCallback(PluginCall call) {
        boolean granted = getPermissionState("microphone") == PermissionState.GRANTED;
        JSObject ret = new JSObject();
        ret.put("granted", granted);
        ret.put("state", getPermissionState("microphone").toString());
        call.resolve(ret);
    }

    @PluginMethod
    public void openAppSettings(PluginCall call) {
        try {
            Intent intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
            Uri uri = Uri.fromParts("package", getContext().getPackageName(), null);
            intent.setData(uri);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);

            JSObject result = new JSObject();
            result.put("success", true);
            call.resolve(result);
        } catch (Exception e) {
            call.reject("Could not open application settings", e);
        }
    }

    @PluginMethod
    public void listen(PluginCall call) {
        if (getPermissionState("microphone") != PermissionState.GRANTED) {
            pendingCall = call;
            requestPermissionForAlias("microphone", call, "permissionCallback");
            return;
        }

        startListening(call);
    }

    @PermissionCallback
    public void permissionCallback(PluginCall call) {
        if (getPermissionState("microphone") == PermissionState.GRANTED) {
            PluginCall targetCall = pendingCall != null ? pendingCall : call;
            pendingCall = null;
            startListening(targetCall);
        } else {
            pendingCall = null;
            JSObject ret = new JSObject();
            ret.put("text", "");
            ret.put("error", "not-allowed");
            ret.put("message", "Microphone permission was denied.");
            call.resolve(ret);
        }
    }

    private void startListening(PluginCall call) {
        pendingCall = call;

        try {
            Intent intent = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
            intent.putExtra(
                RecognizerIntent.EXTRA_LANGUAGE_MODEL,
                RecognizerIntent.LANGUAGE_MODEL_FREE_FORM
            );

            String lang = call.getString("lang");
            if (lang != null && !lang.isEmpty()) {
                intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE, lang);
                intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_PREFERENCE, lang);
                intent.putExtra("android.speech.extra.EXTRA_ADDITIONAL_LANGUAGES", new String[]{lang, "en-US"});
            }

            intent.putExtra(RecognizerIntent.EXTRA_PROMPT, "Speak to Zazan AI");
            intent.putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 1);

            startActivityForResult(call, intent, SPEECH_REQUEST);
        } catch (ActivityNotFoundException e) {
            pendingCall = null;
            JSObject ret = new JSObject();
            ret.put("text", "");
            ret.put("error", "not-supported");
            ret.put("message", "Speech recognition service not found on this device.");
            call.resolve(ret);
        } catch (Exception e) {
            pendingCall = null;
            JSObject ret = new JSObject();
            ret.put("text", "");
            ret.put("error", "error");
            ret.put("message", e.getMessage());
            call.resolve(ret);
        }
    }

    @Override
    protected void handleOnActivityResult(
            int requestCode,
            int resultCode,
            Intent data
    ) {
        super.handleOnActivityResult(requestCode, resultCode, data);

        if (requestCode != SPEECH_REQUEST || pendingCall == null) {
            return;
        }

        PluginCall call = pendingCall;
        pendingCall = null;

        if (resultCode != android.app.Activity.RESULT_OK || data == null) {
            JSObject result = new JSObject();
            result.put("text", "");
            result.put("error", "no-speech");
            call.resolve(result);
            return;
        }

        ArrayList<String> results =
                data.getStringArrayListExtra(RecognizerIntent.EXTRA_RESULTS);

        if (results == null || results.isEmpty()) {
            JSObject result = new JSObject();
            result.put("text", "");
            result.put("error", "no-speech");
            call.resolve(result);
            return;
        }

        JSObject result = new JSObject();
        result.put("text", results.get(0));
        call.resolve(result);
    }
}
