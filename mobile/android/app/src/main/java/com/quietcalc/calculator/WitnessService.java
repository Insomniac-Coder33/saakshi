package com.quietcalc.calculator;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Intent;
import android.os.Build;
import android.os.IBinder;
import android.os.PowerManager;
import androidx.core.app.NotificationCompat;
import androidx.core.app.ServiceCompat;

/**
 * Keeps the silent witness running with the screen locked.
 *
 * Saakshi records in the WebView (web/lib/capture.ts), not here. But Android takes the camera, the
 * microphone and location away from an app that isn't on screen, and may freeze or kill its process,
 * unless a foreground service holds them. This service holds whichever of the three she has allowed,
 * plus a partial wake lock, for as long as an SOS runs, so the web recorder carries on.
 *
 * Android requires the service to show a notification. Like everything else on the home screen, it
 * says only "Calculator", stays out of the status bar, and is hidden on the lock screen.
 */
public class WitnessService extends Service {
    static final String EXTRA_TYPES = "types";
    private static final String CHANNEL = "calc";
    private static final int NOTIFICATION_ID = 7;
    // A recording can't run longer than this without her phone being unlocked again.
    private static final long MAX_HOLD_MS = 3 * 60 * 60 * 1000L;

    private PowerManager.WakeLock wakeLock;

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        int types = intent == null ? 0 : intent.getIntExtra(EXTRA_TYPES, 0);
        ServiceCompat.startForeground(this, NOTIFICATION_ID, notification(), types);
        if (wakeLock == null) {
            PowerManager pm = (PowerManager) getSystemService(POWER_SERVICE);
            wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "calc:witness");
            wakeLock.setReferenceCounted(false);
            wakeLock.acquire(MAX_HOLD_MS);
        }
        // If Android kills the app anyway, there is no recorder left to keep alive.
        return START_NOT_STICKY;
    }

    private Notification notification() {
        NotificationManager nm = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && nm.getNotificationChannel(CHANNEL) == null) {
            NotificationChannel channel = new NotificationChannel(CHANNEL, getString(R.string.app_name), NotificationManager.IMPORTANCE_MIN);
            channel.setShowBadge(false);
            channel.setLockscreenVisibility(Notification.VISIBILITY_SECRET);
            nm.createNotificationChannel(channel);
        }
        Intent open = new Intent(this, MainActivity.class).setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent tap = PendingIntent.getActivity(this, 0, open, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
        return new NotificationCompat.Builder(this, CHANNEL)
            .setSmallIcon(R.drawable.ic_stat_calc)
            .setContentTitle(getString(R.string.app_name))
            .setContentIntent(tap)
            .setOngoing(true)
            .setSilent(true)
            .setShowWhen(false)
            .setPriority(NotificationCompat.PRIORITY_MIN)
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
            .setVisibility(NotificationCompat.VISIBILITY_SECRET)
            .setForegroundServiceBehavior(NotificationCompat.FOREGROUND_SERVICE_DEFERRED)
            .build();
    }

    @Override
    public void onDestroy() {
        if (wakeLock != null && wakeLock.isHeld()) wakeLock.release();
        wakeLock = null;
        ServiceCompat.stopForeground(this, ServiceCompat.STOP_FOREGROUND_REMOVE);
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
