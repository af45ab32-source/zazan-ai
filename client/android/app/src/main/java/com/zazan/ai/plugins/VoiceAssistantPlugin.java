package com.zazan.ai.plugins;

import android.Manifest;
import android.content.Intent;
import android.os.Bundle;
import android.speech.RecognizerIntent;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.PluginMethod;

import java.util.ArrayList;

@CapacitorPlugin(
    name = "VoiceAssistant",
    permissions = {
        @com.getcapacitor.annotation.Permission(
            alias = "microphone",
            strings = { Manifest.permission.RECORD_AUDIO }
        )
    }
)
public class VoiceAssistantPlugin extends Plugin {

    private static final int SPEECH_REQUEST = 9001;
    private PluginCall pendingCall;

    @PluginMethod
    public void listen(PluginCall call) {
        if (getPermissionState("microphone") != com.getcapacitor.PermissionState.GRANTED) {
            pendingCall = call;
            requestPermissionForAlias("microphone", call, "permissionCallback");
            return;
        }

        startListening(call);
    }

    @PluginMethod
    public void permissionCallback(PluginCall call) {
        if (getPermissionState("microphone") ==
                com.getcapacitor.PermissionState.GRANTED) {
            startListening(pendingCall != null ? pendingCall : call);
            pendingCall = null;
        } else {
            call.reject("Microphone permission denied");
        }
    }

    private void startListening(PluginCall call) {
        pendingCall = call;

        Intent intent = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
        intent.putExtra(
            RecognizerIntent.EXTRA_LANGUAGE_MODEL,
            RecognizerIntent.LANGUAGE_MODEL_FREE_FORM
        );
        intent.putExtra(RecognizerIntent.EXTRA_PROMPT, "Speak to Zazan");

        startActivityForResult(call, intent, SPEECH_REQUEST);
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
            call.reject("No speech detected");
            return;
        }

        ArrayList<String> results =
                data.getStringArrayListExtra(RecognizerIntent.EXTRA_RESULTS);

        if (results == null || results.isEmpty()) {
            call.reject("No speech detected");
            return;
        }

        JSObject result = new JSObject();
        result.put("text", results.get(0));
        call.resolve(result);
    }
}
