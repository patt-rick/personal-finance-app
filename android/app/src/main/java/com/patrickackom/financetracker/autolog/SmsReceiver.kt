package com.patrickackom.financetracker.autolog

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.provider.Telephony
import android.util.Log
import java.security.MessageDigest
import java.util.UUID

class SmsReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != Telephony.Sms.Intents.SMS_RECEIVED_ACTION) return

        val prefs = AutoLogPrefs.get(context)
        if (!prefs.enabled || !prefs.captureSms) return

        val grouped = try {
            Telephony.Sms.Intents.getMessagesFromIntent(intent)
                .orEmpty()
                .groupBy { it.originatingAddress ?: "" }
        } catch (e: Exception) {
            Log.w(TAG, "Failed to read SMS intent", e)
            return
        }

        for ((sender, parts) in grouped) {
            if (sender.isEmpty()) continue
            if (!isSenderAllowed(sender, prefs.allowedSenders)) continue

            val body = parts.joinToString("") { it.messageBody ?: "" }
            if (body.isBlank()) continue

            val timestamp = parts.firstOrNull()?.timestampMillis ?: System.currentTimeMillis()
            val event = RawEvent(
                id = UUID.randomUUID().toString(),
                source = "sms",
                packageName = null,
                sender = sender,
                title = null,
                body = body,
                timestamp = timestamp,
                rawHash = hash("sms|$sender|$body|$timestamp")
            )

            AutoLogQueue.add(context, event)
            AutoLogEventEmitter.emit(event)
        }
    }

    private fun isSenderAllowed(sender: String, allowed: List<String>): Boolean {
        if (allowed.isEmpty()) return true
        val normalized = sender.trim().lowercase()
        return allowed.any { entry ->
            val e = entry.trim().lowercase()
            if (e.isEmpty()) false
            else normalized == e || normalized.contains(e) || e.contains(normalized)
        }
    }

    private fun hash(input: String): String {
        return try {
            val bytes = MessageDigest.getInstance("SHA-256").digest(input.toByteArray(Charsets.UTF_8))
            bytes.joinToString("") { "%02x".format(it) }
        } catch (e: Exception) {
            input.hashCode().toString()
        }
    }

    companion object {
        private const val TAG = "AutoLogSmsReceiver"
    }
}
