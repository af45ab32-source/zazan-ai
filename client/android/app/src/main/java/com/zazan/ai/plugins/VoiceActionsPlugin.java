package com.zazan.ai.plugins;

import android.content.Intent;
import android.net.Uri;
import android.provider.MediaStore;

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
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);

            JSObject result = new JSObject();
            result.put("success", true);
            call.resolve(result);

        } catch (Exception e) {
            call.reject("Could not open URL", e);
        }
    }

    @PluginMethod
    public void openCamera(PluginCall call) {
        try {
            Intent intent = new Intent(MediaStore.ACTION_IMAGE_CAPTURE);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);

            JSObject result = new JSObject();
            result.put("success", true);
            call.resolve(result);
        } catch (Exception e) {
            call.reject("Could not open camera", e);
        }
    }

    @PluginMethod
    public void openMaps(PluginCall call) {
        String query = call.getString("query", "");
        try {
            Uri gmmIntentUri = Uri.parse("geo:0,0?q=" + Uri.encode(query));
            Intent mapIntent = new Intent(Intent.ACTION_VIEW, gmmIntentUri);
            mapIntent.setPackage("com.google.android.apps.maps");
            mapIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);

            if (mapIntent.resolveActivity(getContext().getPackageManager()) != null) {
                getContext().startActivity(mapIntent);
            } else {
                Intent webIntent = new Intent(Intent.ACTION_VIEW, Uri.parse("https://maps.google.com/?q=" + Uri.encode(query)));
                webIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getContext().startActivity(webIntent);
            }

            JSObject result = new JSObject();
            result.put("success", true);
            call.resolve(result);
        } catch (Exception e) {
            call.reject("Could not open maps", e);
        }
    }

    @PluginMethod
    public void openYouTube(PluginCall call) {
        String query = call.getString("query", "");
        try {
            Intent intent;
            if (query != null && !query.isEmpty()) {
                intent = new Intent(Intent.ACTION_VIEW, Uri.parse("https://www.youtube.com/results?search_query=" + Uri.encode(query)));
            } else {
                intent = getContext().getPackageManager().getLaunchIntentForPackage("com.google.android.youtube");
                if (intent == null) {
                    intent = new Intent(Intent.ACTION_VIEW, Uri.parse("https://www.youtube.com"));
                }
            }
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);

            JSObject result = new JSObject();
            result.put("success", true);
            call.resolve(result);
        } catch (Exception e) {
            call.reject("Could not open YouTube", e);
        }
    }

    @PluginMethod
    public void openWhatsApp(PluginCall call) {
        String phone = call.getString("phone", "");
        String message = call.getString("message", "");
        try {
            Uri uri = Uri.parse("https://api.whatsapp.com/send?phone=" + Uri.encode(phone) + "&text=" + Uri.encode(message));
            Intent intent = new Intent(Intent.ACTION_VIEW, uri);
            intent.setPackage("com.whatsapp");
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);

            if (intent.resolveActivity(getContext().getPackageManager()) != null) {
                getContext().startActivity(intent);
            } else {
                Intent webIntent = new Intent(Intent.ACTION_VIEW, uri);
                webIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getContext().startActivity(webIntent);
            }

            JSObject result = new JSObject();
            result.put("success", true);
            call.resolve(result);
        } catch (Exception e) {
            call.reject("Could not open WhatsApp", e);
        }
    }
}
