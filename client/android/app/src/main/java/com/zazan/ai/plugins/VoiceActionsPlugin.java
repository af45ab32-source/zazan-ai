package com.zazan.ai.plugins;

import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.provider.MediaStore;
import android.util.Log;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.PluginMethod;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@CapacitorPlugin(name = "VoiceActions")
public class VoiceActionsPlugin extends Plugin {

    private static final String TAG = "VoiceActionsPlugin";

    // Known package aliases for multi-variant apps (e.g. WhatsApp / WhatsApp Business)
    private static final Map<String, List<String>> PACKAGE_VARIANTS = new HashMap<>();

    static {
        PACKAGE_VARIANTS.put("com.whatsapp", Arrays.asList("com.whatsapp", "com.whatsapp.w4b"));
        PACKAGE_VARIANTS.put("com.facebook.katana", Arrays.asList("com.facebook.katana", "com.facebook.lite", "com.facebook.android"));
        PACKAGE_VARIANTS.put("com.zhiliaoapp.musically", Arrays.asList("com.zhiliaoapp.musically", "com.zhiliaoapp.musically.go", "com.ss.android.ugc.trill"));
        PACKAGE_VARIANTS.put("com.google.android.youtube", Arrays.asList("com.google.android.youtube"));
        PACKAGE_VARIANTS.put("com.instagram.android", Arrays.asList("com.instagram.android", "com.instagram.lite"));
        PACKAGE_VARIANTS.put("com.google.android.apps.maps", Arrays.asList("com.google.android.apps.maps", "com.google.android.apps.mapslite"));
    }

    private String findInstalledPackage(String requestedPackage) {
        PackageManager pm = getContext().getPackageManager();
        List<String> candidates = PACKAGE_VARIANTS.get(requestedPackage);
        if (candidates == null) {
            candidates = new ArrayList<>();
            candidates.add(requestedPackage);
        }

        for (String pkg : candidates) {
            try {
                Intent launchIntent = pm.getLaunchIntentForPackage(pkg);
                if (launchIntent != null) {
                    return pkg;
                }
            } catch (Exception ignored) {}
        }

        return null;
    }

    @PluginMethod
    public void isAppInstalled(PluginCall call) {
        String packageName = call.getString("packageName");
        if (packageName == null || packageName.isEmpty()) {
            call.reject("packageName is required");
            return;
        }

        String installed = findInstalledPackage(packageName);
        JSObject ret = new JSObject();
        ret.put("installed", installed != null);
        ret.put("resolvedPackage", installed != null ? installed : packageName);
        call.resolve(ret);
    }

    @PluginMethod
    public void openApp(PluginCall call) {
        String packageName = call.getString("packageName");

        if (packageName == null || packageName.isEmpty()) {
            call.reject("packageName is required");
            return;
        }

        try {
            String installedPackage = findInstalledPackage(packageName);

            if (installedPackage == null) {
                // Return structured response instead of crashing / throwing unhandled error
                JSObject result = new JSObject();
                result.put("success", false);
                result.put("installed", false);
                result.put("opened", false);
                result.put("packageName", packageName);
                result.put("message", "App is not installed on this device");

                boolean openStoreIfMissing = call.getBoolean("openStoreIfMissing", false);
                if (openStoreIfMissing) {
                    openStoreForPackage(packageName);
                    result.put("openedStore", true);
                }

                call.resolve(result);
                return;
            }

            Intent launchIntent = getContext().getPackageManager().getLaunchIntentForPackage(installedPackage);
            if (launchIntent == null) {
                JSObject result = new JSObject();
                result.put("success", false);
                result.put("installed", false);
                result.put("opened", false);
                result.put("packageName", packageName);
                result.put("message", "Could not generate launch intent for package");
                call.resolve(result);
                return;
            }

            launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(launchIntent);

            JSObject result = new JSObject();
            result.put("success", true);
            result.put("installed", true);
            result.put("opened", true);
            result.put("resolvedPackage", installedPackage);
            call.resolve(result);

        } catch (Exception e) {
            Log.e(TAG, "Exception opening app " + packageName, e);
            JSObject result = new JSObject();
            result.put("success", false);
            result.put("installed", false);
            result.put("opened", false);
            result.put("error", e.getMessage());
            call.resolve(result);
        }
    }

    private void openStoreForPackage(String packageName) {
        try {
            Intent storeIntent = new Intent(Intent.ACTION_VIEW, Uri.parse("market://details?id=" + packageName));
            storeIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(storeIntent);
        } catch (Exception e) {
            try {
                Intent webStoreIntent = new Intent(Intent.ACTION_VIEW, Uri.parse("https://play.google.com/store/apps/details?id=" + packageName));
                webStoreIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getContext().startActivity(webStoreIntent);
            } catch (Exception ignored) {}
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
            String installedPackage = findInstalledPackage("com.google.android.youtube");

            if (installedPackage != null) {
                Intent intent;
                if (query != null && !query.isEmpty()) {
                    intent = new Intent(Intent.ACTION_VIEW, Uri.parse("https://www.youtube.com/results?search_query=" + Uri.encode(query)));
                } else {
                    intent = getContext().getPackageManager().getLaunchIntentForPackage(installedPackage);
                    if (intent == null) {
                        intent = new Intent(Intent.ACTION_VIEW, Uri.parse("https://www.youtube.com"));
                    }
                }
                intent.setPackage(installedPackage);
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getContext().startActivity(intent);
            } else {
                String targetUrl = (query != null && !query.isEmpty())
                        ? "https://www.youtube.com/results?search_query=" + Uri.encode(query)
                        : "https://www.youtube.com";
                Intent webIntent = new Intent(Intent.ACTION_VIEW, Uri.parse(targetUrl));
                webIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getContext().startActivity(webIntent);
            }

            JSObject result = new JSObject();
            result.put("success", true);
            result.put("installed", installedPackage != null);
            call.resolve(result);
        } catch (Exception e) {
            Log.e(TAG, "Could not open YouTube", e);
            JSObject result = new JSObject();
            result.put("success", false);
            result.put("error", e.getMessage());
            call.resolve(result);
        }
    }

    @PluginMethod
    public void openWhatsApp(PluginCall call) {
        String phone = call.getString("phone", "");
        String message = call.getString("message", "");
        try {
            String installedPackage = findInstalledPackage("com.whatsapp");

            Uri uri = Uri.parse("https://api.whatsapp.com/send?phone=" + Uri.encode(phone) + "&text=" + Uri.encode(message));
            Intent intent = new Intent(Intent.ACTION_VIEW, uri);
            if (installedPackage != null) {
                intent.setPackage(installedPackage);
            }
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);

            if (installedPackage != null || intent.resolveActivity(getContext().getPackageManager()) != null) {
                getContext().startActivity(intent);
            } else {
                Intent webIntent = new Intent(Intent.ACTION_VIEW, uri);
                webIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getContext().startActivity(webIntent);
            }

            JSObject result = new JSObject();
            result.put("success", true);
            result.put("installed", installedPackage != null);
            call.resolve(result);
        } catch (Exception e) {
            Log.e(TAG, "Could not open WhatsApp", e);
            JSObject result = new JSObject();
            result.put("success", false);
            result.put("error", e.getMessage());
            call.resolve(result);
        }
    }

    @PluginMethod
    public void openFacebook(PluginCall call) {
        try {
            String installedPackage = findInstalledPackage("com.facebook.katana");
            if (installedPackage != null) {
                Intent intent = getContext().getPackageManager().getLaunchIntentForPackage(installedPackage);
                if (intent != null) {
                    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    getContext().startActivity(intent);
                } else {
                    Intent webIntent = new Intent(Intent.ACTION_VIEW, Uri.parse("https://www.facebook.com"));
                    webIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    getContext().startActivity(webIntent);
                }
            } else {
                Intent webIntent = new Intent(Intent.ACTION_VIEW, Uri.parse("https://www.facebook.com"));
                webIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getContext().startActivity(webIntent);
            }

            JSObject result = new JSObject();
            result.put("success", true);
            result.put("installed", installedPackage != null);
            call.resolve(result);
        } catch (Exception e) {
            Log.e(TAG, "Could not open Facebook", e);
            JSObject result = new JSObject();
            result.put("success", false);
            result.put("error", e.getMessage());
            call.resolve(result);
        }
    }

    @PluginMethod
    public void openTikTok(PluginCall call) {
        try {
            String installedPackage = findInstalledPackage("com.zhiliaoapp.musically");
            if (installedPackage != null) {
                Intent intent = getContext().getPackageManager().getLaunchIntentForPackage(installedPackage);
                if (intent != null) {
                    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    getContext().startActivity(intent);
                } else {
                    Intent webIntent = new Intent(Intent.ACTION_VIEW, Uri.parse("https://www.tiktok.com"));
                    webIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    getContext().startActivity(webIntent);
                }
            } else {
                Intent webIntent = new Intent(Intent.ACTION_VIEW, Uri.parse("https://www.tiktok.com"));
                webIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getContext().startActivity(webIntent);
            }

            JSObject result = new JSObject();
            result.put("success", true);
            result.put("installed", installedPackage != null);
            call.resolve(result);
        } catch (Exception e) {
            Log.e(TAG, "Could not open TikTok", e);
            JSObject result = new JSObject();
            result.put("success", false);
            result.put("error", e.getMessage());
            call.resolve(result);
        }
    }
}
