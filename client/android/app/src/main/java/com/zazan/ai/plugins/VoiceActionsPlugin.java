package com.zazan.ai.plugins;

import android.content.Intent;
import android.net.Uri;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.PluginMethod;

@CapacitorPlugin(name = "VoiceActions")
public class VoiceActionsPlugin extends Plugin {

    @PluginMethod
    public void openApp(PluginCall call) {
        String packageName = call.getString("packageName");

        if (packageName == null || packageName.isEmpty()) {
            call.reject("packageName is required");
            return;
        }

        try {
            Intent launchIntent =
                    getContext().getPackageManager()
                            .getLaunchIntentForPackage(packageName);

            if (launchIntent == null) {
                call.reject("App is not installed");
                return;
            }

            launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(launchIntent);

            JSObject result = new JSObject();
            result.put("success", true);
            call.resolve(result);

        } catch (Exception e) {
            call.reject("Could not open app", e);
        }
    }

    @PluginMethod
    public void openUrl(PluginCall call) {
        String url = call.getString("url");

        if (url == null || url.isEmpty()) {
            call.reject("url is required");
            return;
        }

        try {
            Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
            getContext().startActivity(intent);

            JSObject result = new JSObject();
            result.put("success", true);
            call.resolve(result);

        } catch (Exception e) {
            call.reject("Could not open URL", e);
        }
    }
}
