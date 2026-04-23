package com.yourcompany.financetracker.autolog

import android.content.Context
import android.util.Log
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.util.UUID

internal data class RawEvent(
    val id: String,
    val source: String,
    val packageName: String?,
    val sender: String?,
    val title: String?,
    val body: String,
    val timestamp: Long,
    val rawHash: String
) {
    fun toJson(): JSONObject = JSONObject().apply {
        put("id", id)
        put("source", source)
        putOpt("packageName", packageName)
        putOpt("sender", sender)
        putOpt("title", title)
        put("body", body)
        put("timestamp", timestamp)
        put("rawHash", rawHash)
    }

    companion object {
        fun fromJson(obj: JSONObject): RawEvent = RawEvent(
            id = obj.optString("id", UUID.randomUUID().toString()),
            source = obj.optString("source", "sms"),
            packageName = obj.optString("packageName").ifBlank { null },
            sender = obj.optString("sender").ifBlank { null },
            title = obj.optString("title").ifBlank { null },
            body = obj.optString("body", ""),
            timestamp = obj.optLong("timestamp", System.currentTimeMillis()),
            rawHash = obj.optString("rawHash", "")
        )
    }
}

internal object AutoLogQueue {
    private const val TAG = "AutoLogQueue"
    private const val FILE_NAME = "autolog_queue.json"
    private const val MAX_EVENTS = 500
    private const val MAX_BODY_CHARS = 4000
    private val lock = Any()

    fun add(context: Context, event: RawEvent) {
        synchronized(lock) {
            val existing = readAll(context).toMutableList()
            if (existing.any { it.rawHash == event.rawHash && it.rawHash.isNotEmpty() }) {
                return
            }
            val trimmed = event.copy(body = event.body.take(MAX_BODY_CHARS))
            existing.add(trimmed)
            while (existing.size > MAX_EVENTS) {
                existing.removeAt(0)
            }
            writeAll(context, existing)
        }
    }

    fun all(context: Context): List<RawEvent> {
        synchronized(lock) {
            return readAll(context)
        }
    }

    fun remove(context: Context, ids: Collection<String>) {
        if (ids.isEmpty()) return
        synchronized(lock) {
            val remaining = readAll(context).filterNot { it.id in ids }
            writeAll(context, remaining)
        }
    }

    fun clear(context: Context) {
        synchronized(lock) {
            file(context).delete()
        }
    }

    private fun file(context: Context): File = File(context.filesDir, FILE_NAME)

    private fun readAll(context: Context): List<RawEvent> {
        val f = file(context)
        if (!f.exists()) return emptyList()
        return try {
            val text = f.readText(Charsets.UTF_8)
            if (text.isBlank()) return emptyList()
            val arr = JSONArray(text)
            buildList {
                for (i in 0 until arr.length()) {
                    val obj = arr.optJSONObject(i) ?: continue
                    add(RawEvent.fromJson(obj))
                }
            }
        } catch (e: Exception) {
            Log.w(TAG, "Queue read failed; resetting", e)
            f.delete()
            emptyList()
        }
    }

    private fun writeAll(context: Context, events: List<RawEvent>) {
        try {
            val arr = JSONArray()
            for (ev in events) arr.put(ev.toJson())
            val tmp = File(context.filesDir, "$FILE_NAME.tmp")
            tmp.writeText(arr.toString(), Charsets.UTF_8)
            val target = file(context)
            if (target.exists()) target.delete()
            if (!tmp.renameTo(target)) {
                tmp.copyTo(target, overwrite = true)
                tmp.delete()
            }
        } catch (e: Exception) {
            Log.e(TAG, "Queue write failed", e)
        }
    }
}
