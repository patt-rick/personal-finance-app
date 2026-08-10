package com.patrickackom.financetracker.autolog

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.WritableMap
import com.facebook.react.modules.core.DeviceEventManagerModule
import java.lang.ref.WeakReference

internal object AutoLogEventEmitter {
    private const val EVENT_NAME = "AutoLog:RawEvent"
    private var contextRef: WeakReference<ReactApplicationContext>? = null

    fun bind(context: ReactApplicationContext) {
        contextRef = WeakReference(context)
    }

    fun unbind() {
        contextRef = null
    }

    fun emit(event: RawEvent) {
        val ctx = contextRef?.get() ?: return
        if (!ctx.hasActiveReactInstance()) return
        val payload: WritableMap = Arguments.createMap().apply {
            putString("id", event.id)
            putString("source", event.source)
            if (event.packageName != null) putString("packageName", event.packageName) else putNull("packageName")
            if (event.sender != null) putString("sender", event.sender) else putNull("sender")
            if (event.title != null) putString("title", event.title) else putNull("title")
            putString("body", event.body)
            putDouble("timestamp", event.timestamp.toDouble())
            putString("rawHash", event.rawHash)
        }
        try {
            ctx.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                .emit(EVENT_NAME, payload)
        } catch (e: Exception) {
            // JS side may not be listening yet; fine.
        }
    }
}
