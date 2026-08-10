package com.yourcompany.financetracker.autolog

import android.content.Intent
import android.net.Uri
import android.provider.Settings
import android.text.TextUtils
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableArray

class AutoLogModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = MODULE_NAME

    override fun initialize() {
        super.initialize()
        AutoLogEventEmitter.bind(reactContext)
    }

    override fun invalidate() {
        AutoLogEventEmitter.unbind()
        super.invalidate()
    }

    @ReactMethod
    fun isEnabled(promise: Promise) {
        try {
            promise.resolve(AutoLogPrefs.get(reactContext).enabled)
        } catch (e: Exception) {
            promise.reject(ERR_IO, e)
        }
    }

    @ReactMethod
    fun setEnabled(value: Boolean, promise: Promise) {
        try {
            AutoLogPrefs.setEnabled(reactContext, value)
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject(ERR_IO, e)
        }
    }

    @ReactMethod
    fun setCaptureSms(value: Boolean, promise: Promise) {
        try {
            AutoLogPrefs.setCaptureSms(reactContext, value)
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject(ERR_IO, e)
        }
    }

    @ReactMethod
    fun setCaptureNotifications(value: Boolean, promise: Promise) {
        try {
            AutoLogPrefs.setCaptureNotifications(reactContext, value)
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject(ERR_IO, e)
        }
    }

    @ReactMethod
    fun setAllowedPackages(values: ReadableArray, promise: Promise) {
        try {
            AutoLogPrefs.setAllowedPackages(reactContext, readableArrayToStringList(values))
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject(ERR_IO, e)
        }
    }

    @ReactMethod
    fun setAllowedSenders(values: ReadableArray, promise: Promise) {
        try {
            AutoLogPrefs.setAllowedSenders(reactContext, readableArrayToStringList(values))
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject(ERR_IO, e)
        }
    }

    @ReactMethod
    fun drainQueue(promise: Promise) {
        try {
            val events = AutoLogQueue.all(reactContext)
            val result = Arguments.createArray()
            for (ev in events) {
                val map = Arguments.createMap().apply {
                    putString("id", ev.id)
                    putString("source", ev.source)
                    if (ev.packageName != null) putString("packageName", ev.packageName) else putNull("packageName")
                    if (ev.sender != null) putString("sender", ev.sender) else putNull("sender")
                    if (ev.title != null) putString("title", ev.title) else putNull("title")
                    putString("body", ev.body)
                    putDouble("timestamp", ev.timestamp.toDouble())
                    putString("rawHash", ev.rawHash)
                }
                result.pushMap(map)
            }
            promise.resolve(result)
        } catch (e: Exception) {
            promise.reject(ERR_IO, e)
        }
    }

    @ReactMethod
    fun clearQueue(ids: ReadableArray, promise: Promise) {
        try {
            AutoLogQueue.remove(reactContext, readableArrayToStringList(ids))
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject(ERR_IO, e)
        }
    }

    @ReactMethod
    fun openNotificationAccessSettings(promise: Promise) {
        try {
            val intent = Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS)
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            reactContext.startActivity(intent)
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject(ERR_ACTIVITY, e)
        }
    }

    @ReactMethod
    fun hasNotificationListenerAccess(promise: Promise) {
        try {
            val pkg = reactContext.packageName
            val flat = Settings.Secure.getString(reactContext.contentResolver, "enabled_notification_listeners")
            if (flat.isNullOrEmpty()) {
                promise.resolve(false)
                return
            }
            val splitter = TextUtils.SimpleStringSplitter(':')
            splitter.setString(flat)
            for (entry in splitter) {
                val component = entry.substringBefore("/", "")
                if (component == pkg) {
                    promise.resolve(true)
                    return
                }
            }
            promise.resolve(false)
        } catch (e: Exception) {
            promise.reject(ERR_IO, e)
        }
    }

    @ReactMethod
    fun getInstalledApps(promise: Promise) {
        try {
            val pm = reactContext.packageManager
            val intent = Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER)
            val resolved = pm.queryIntentActivities(intent, 0)
            val seen = HashSet<String>()
            val result = Arguments.createArray()
            for (info in resolved) {
                val pkg = info.activityInfo?.packageName ?: continue
                if (!seen.add(pkg)) continue
                val label = try {
                    info.loadLabel(pm)?.toString() ?: pkg
                } catch (e: Exception) {
                    pkg
                }
                val map = Arguments.createMap().apply {
                    putString("packageName", pkg)
                    putString("label", label)
                }
                result.pushMap(map)
            }
            promise.resolve(result)
        } catch (e: Exception) {
            promise.reject(ERR_IO, e)
        }
    }

    @ReactMethod
    fun openAppNotificationSettings(promise: Promise) {
        try {
            val intent = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS)
                .setData(Uri.fromParts("package", reactContext.packageName, null))
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            reactContext.startActivity(intent)
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject(ERR_ACTIVITY, e)
        }
    }

    @ReactMethod
    fun addListener(@Suppress("UNUSED_PARAMETER") eventName: String) {
        // Required for RN built-in Event Emitter; no-op.
    }

    @ReactMethod
    fun removeListeners(@Suppress("UNUSED_PARAMETER") count: Int) {
        // Required for RN built-in Event Emitter; no-op.
    }

    private fun readableArrayToStringList(arr: ReadableArray): List<String> {
        val out = ArrayList<String>(arr.size())
        for (i in 0 until arr.size()) {
            val s = try {
                arr.getString(i)
            } catch (e: Exception) {
                null
            }
            if (!s.isNullOrBlank()) out.add(s)
        }
        return out
    }

    companion object {
        const val MODULE_NAME = "AutoLogModule"
        private const val ERR_IO = "AUTOLOG_IO"
        private const val ERR_ACTIVITY = "AUTOLOG_ACTIVITY"
    }
}
