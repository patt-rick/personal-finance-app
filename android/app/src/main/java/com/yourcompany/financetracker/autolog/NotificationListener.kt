package com.yourcompany.financetracker.autolog

import android.app.Notification
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import android.util.Log
import java.security.MessageDigest
import java.util.UUID

class NotificationListener : NotificationListenerService() {

    override fun onNotificationPosted(sbn: StatusBarNotification?) {
        val notification = sbn ?: return
        val context = applicationContext

        val prefs = AutoLogPrefs.get(context)
        if (!prefs.enabled || !prefs.captureNotifications) return

        val pkg = notification.packageName ?: return
        if (pkg == context.packageName) return
        if (!isPackageAllowed(pkg, prefs.allowedPackages)) return

        val extras = notification.notification?.extras ?: return
        val title = extras.getCharSequence(Notification.EXTRA_TITLE)?.toString()?.take(200)
        val text = (
            extras.getCharSequence(Notification.EXTRA_BIG_TEXT)?.toString()
                ?: extras.getCharSequence(Notification.EXTRA_TEXT)?.toString()
                ?: extras.getCharSequence(Notification.EXTRA_SUB_TEXT)?.toString()
        )?.take(2000)

        val body = listOfNotNull(title, text).joinToString(" — ").trim()
        if (body.isBlank()) return

        val postTime = notification.postTime
        val event = RawEvent(
            id = UUID.randomUUID().toString(),
            source = "notification",
            packageName = pkg,
            sender = null,
            title = title,
            body = body,
            timestamp = postTime,
            rawHash = hash("notif|$pkg|$title|$text|$postTime")
        )

        AutoLogQueue.add(context, event)
        AutoLogEventEmitter.emit(event)
    }

    override fun onNotificationRemoved(sbn: StatusBarNotification?) {
        // no-op
    }

    private fun isPackageAllowed(pkg: String, allowed: List<String>): Boolean {
        if (allowed.isEmpty()) return true
        val p = pkg.trim().lowercase()
        return allowed.any { it.trim().lowercase() == p }
    }

    private fun hash(input: String): String {
        return try {
            val bytes = MessageDigest.getInstance("SHA-256").digest(input.toByteArray(Charsets.UTF_8))
            bytes.joinToString("") { "%02x".format(it) }
        } catch (e: Exception) {
            Log.w(TAG, "hash failed", e)
            input.hashCode().toString()
        }
    }

    companion object {
        private const val TAG = "AutoLogNotifListener"
    }
}
