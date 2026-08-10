package com.yourcompany.financetracker.autolog

import android.content.Context
import android.content.SharedPreferences
import org.json.JSONArray

internal data class AutoLogPrefsSnapshot(
    val enabled: Boolean,
    val captureSms: Boolean,
    val captureNotifications: Boolean,
    val allowedPackages: List<String>,
    val allowedSenders: List<String>
)

internal object AutoLogPrefs {
    private const val FILE = "autolog_prefs"
    private const val KEY_ENABLED = "enabled"
    private const val KEY_CAPTURE_SMS = "capture_sms"
    private const val KEY_CAPTURE_NOTIFICATIONS = "capture_notifications"
    private const val KEY_ALLOWED_PACKAGES = "allowed_packages"
    private const val KEY_ALLOWED_SENDERS = "allowed_senders"

    fun get(context: Context): AutoLogPrefsSnapshot {
        val p = prefs(context)
        return AutoLogPrefsSnapshot(
            enabled = p.getBoolean(KEY_ENABLED, false),
            captureSms = p.getBoolean(KEY_CAPTURE_SMS, false),
            captureNotifications = p.getBoolean(KEY_CAPTURE_NOTIFICATIONS, false),
            allowedPackages = parseArray(p.getString(KEY_ALLOWED_PACKAGES, null)),
            allowedSenders = parseArray(p.getString(KEY_ALLOWED_SENDERS, null))
        )
    }

    fun setEnabled(context: Context, value: Boolean) {
        prefs(context).edit().putBoolean(KEY_ENABLED, value).apply()
    }

    fun setCaptureSms(context: Context, value: Boolean) {
        prefs(context).edit().putBoolean(KEY_CAPTURE_SMS, value).apply()
    }

    fun setCaptureNotifications(context: Context, value: Boolean) {
        prefs(context).edit().putBoolean(KEY_CAPTURE_NOTIFICATIONS, value).apply()
    }

    fun setAllowedPackages(context: Context, values: List<String>) {
        prefs(context).edit().putString(KEY_ALLOWED_PACKAGES, stringifyArray(values)).apply()
    }

    fun setAllowedSenders(context: Context, values: List<String>) {
        prefs(context).edit().putString(KEY_ALLOWED_SENDERS, stringifyArray(values)).apply()
    }

    private fun prefs(context: Context): SharedPreferences =
        context.applicationContext.getSharedPreferences(FILE, Context.MODE_PRIVATE)

    private fun parseArray(raw: String?): List<String> {
        if (raw.isNullOrBlank()) return emptyList()
        return try {
            val arr = JSONArray(raw)
            buildList {
                for (i in 0 until arr.length()) {
                    val v = arr.optString(i).trim()
                    if (v.isNotEmpty()) add(v)
                }
            }
        } catch (e: Exception) {
            emptyList()
        }
    }

    private fun stringifyArray(values: List<String>): String {
        val arr = JSONArray()
        for (v in values) {
            val trimmed = v.trim()
            if (trimmed.isNotEmpty()) arr.put(trimmed)
        }
        return arr.toString()
    }
}
