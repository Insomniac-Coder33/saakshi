package com.quietcalc.calculator;

import android.Manifest;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.pm.ServiceInfo;
import android.os.Build;
import androidx.core.content.ContextCompat;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

/**
 * The web app's handle on WitnessService (web/lib/native.ts): start() when an SOS begins, stop() when
 * it ends. start() asks for any of camera, microphone and location she hasn't allowed yet, then holds
 * whichever she has. Android only lets a service hold them if it starts while the app is on screen,
 * which it is: she has just started the SOS.
 */
@CapacitorPlugin(
    name = "Witness",
    permissions = {
        @Permission(alias = "camera", strings = { Manifest.permission.CAMERA }),
        @Permission(alias = "microphone", strings = { Manifest.permission.RECORD_AUDIO }),
        @Permission(alias = "location", strings = { Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION }),
    }
)
public class WitnessPlugin extends Plugin {

    @PluginMethod
    public void start(PluginCall call) {
        if (allowed(Manifest.permission.CAMERA) && allowed(Manifest.permission.RECORD_AUDIO) && locationAllowed()) {
            hold(call);
        } else {
            requestPermissionForAliases(new String[] { "camera", "microphone", "location" }, call, "afterPermissions");
        }
    }

    @PermissionCallback
    private void afterPermissions(PluginCall call) {
        hold(call);
    }

    @PluginMethod
    public void stop(PluginCall call) {
        Context context = getContext();
        context.stopService(new Intent(context, WitnessService.class));
        call.resolve();
    }

    private void hold(PluginCall call) {
        int types = 0;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            if (allowed(Manifest.permission.CAMERA)) types |= ServiceInfo.FOREGROUND_SERVICE_TYPE_CAMERA;
            if (allowed(Manifest.permission.RECORD_AUDIO)) types |= ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE;
            if (locationAllowed()) types |= ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION;
        }
        boolean anything = allowed(Manifest.permission.CAMERA) || allowed(Manifest.permission.RECORD_AUDIO) || locationAllowed();
        JSObject result = new JSObject();
        if (!anything) {
            // Nothing to hold: the web app records what it can while the screen stays on.
            result.put("running", false);
            call.resolve(result);
            return;
        }
        try {
            Context context = getContext();
            ContextCompat.startForegroundService(context, new Intent(context, WitnessService.class).putExtra(WitnessService.EXTRA_TYPES, types));
            result.put("running", true);
        } catch (RuntimeException e) {
            // For example, Android refused because the app had already left the screen.
            result.put("running", false);
            result.put("reason", e.getClass().getSimpleName());
        }
        call.resolve(result);
    }

    private boolean allowed(String permission) {
        return ContextCompat.checkSelfPermission(getContext(), permission) == PackageManager.PERMISSION_GRANTED;
    }

    private boolean locationAllowed() {
        return allowed(Manifest.permission.ACCESS_FINE_LOCATION) || allowed(Manifest.permission.ACCESS_COARSE_LOCATION);
    }
}
