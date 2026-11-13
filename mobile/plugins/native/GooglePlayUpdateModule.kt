package ru.puskweb.atmos

import android.app.Activity
import com.facebook.react.ReactPackage
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.facebook.react.uimanager.ViewManager
import com.google.android.play.core.appupdate.AppUpdateManagerFactory
import com.google.android.play.core.appupdate.AppUpdateOptions
import com.google.android.play.core.install.InstallException
import com.google.android.play.core.install.InstallStateUpdatedListener
import com.google.android.play.core.install.model.AppUpdateType
import com.google.android.play.core.install.model.InstallStatus
import com.google.android.play.core.install.model.UpdateAvailability

class GooglePlayUpdatePackage : ReactPackage {
  override fun createNativeModules(context: ReactApplicationContext): List<NativeModule> = listOf(GooglePlayUpdateModule(context))
  override fun createViewManagers(context: ReactApplicationContext): List<ViewManager<*, *>> = emptyList()
}

class GooglePlayUpdateModule(private val context: ReactApplicationContext) : ReactContextBaseJavaModule(context) {
  private val manager = AppUpdateManagerFactory.create(context)
  private var initialized = false
  private var pending: Promise? = null
  private var listeners = 0
  private val listener = InstallStateUpdatedListener { state ->
    val event = Arguments.createMap().apply {
      putString("packageName", context.packageName)
      putInt("installStatus", normalizeStatus(state.installStatus()))
      putInt("installErrorCode", state.installErrorCode())
      putDouble("bytesDownloaded", state.bytesDownloaded().toDouble())
      putDouble("totalBytesToDownload", state.totalBytesToDownload().toDouble())
    }
    if (listeners > 0 && context.hasActiveReactInstance()) {
      context.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java).emit("InstallStateUpdate", event)
    }
  }

  override fun getName() = "GooglePlayUpdate"

  // Both stores expose the same application-level states; their numeric SDK enums differ.
  private fun normalizeStatus(status: Int): Int = when (status) {
    InstallStatus.DOWNLOADED -> 1
    InstallStatus.DOWNLOADING -> 2
    InstallStatus.FAILED -> 3
    InstallStatus.INSTALLING -> 4
    InstallStatus.PENDING -> 5
    InstallStatus.CANCELED -> 6
    InstallStatus.INSTALLED -> 7
    else -> 0
  }

  @ReactMethod
  fun init() {
    if (initialized) return
    manager.registerListener(listener)
    initialized = true
  }

  @ReactMethod
  fun addListener(event: String) { listeners += 1 }

  @ReactMethod
  fun removeListeners(count: Double) { listeners = (listeners - count.toInt()).coerceAtLeast(0) }

  @ReactMethod
  fun getAppUpdateInfo(promise: Promise) {
    manager.appUpdateInfo.addOnSuccessListener { info ->
      promise.resolve(Arguments.createMap().apply {
        putString("packageName", info.packageName())
        putString("updatedAt", "")
        putInt("updatePriority", info.updatePriority())
        putInt("updateAvailability", info.updateAvailability())
        putInt("availableVersionCode", info.availableVersionCode())
        putInt("installStatus", normalizeStatus(info.installStatus()))
        putDouble("bytesDownloaded", info.bytesDownloaded().toDouble())
        putDouble("totalBytesToDownload", info.totalBytesToDownload().toDouble())
      })
    }.addOnFailureListener { error -> reject(promise, error) }
  }

  @ReactMethod
  fun silent(promise: Promise) {
    if (pending != null) { promise.reject("UPDATE_BUSY", "Update flow already active"); return }
    pending = promise
    manager.appUpdateInfo.addOnSuccessListener { info ->
      val updateType = when {
        info.updateAvailability() == UpdateAvailability.DEVELOPER_TRIGGERED_UPDATE_IN_PROGRESS -> AppUpdateType.IMMEDIATE
        info.isUpdateTypeAllowed(AppUpdateType.FLEXIBLE) -> AppUpdateType.FLEXIBLE
        info.isUpdateTypeAllowed(AppUpdateType.IMMEDIATE) -> AppUpdateType.IMMEDIATE
        else -> null
      }
      val activity = context.currentActivity
      if (activity == null || updateType == null || !info.isUpdateTypeAllowed(updateType)) {
        pending = null
        promise.reject("-5", "Google Play update unavailable")
        return@addOnSuccessListener
      }
      activity.runOnUiThread {
        try {
          // Task carries the consent result directly instead of depending on ReactActivity result forwarding.
          manager.startUpdateFlow(info, activity, AppUpdateOptions.newBuilder(updateType).build())
            .addOnSuccessListener { result ->
              if (pending === promise) {
                pending = null
                if (result == Activity.RESULT_OK || result == Activity.RESULT_CANCELED) promise.resolve(result)
                else promise.reject("UPDATE_FLOW_FAILED", "Google Play rejected update flow")
              }
            }
            .addOnFailureListener { error ->
              if (pending === promise) { pending = null; reject(promise, error) }
            }
        } catch (error: Exception) { pending = null; reject(promise, error) }
      }
    }.addOnFailureListener { error -> pending = null; reject(promise, error) }
  }

  @ReactMethod
  fun completeUpdate(type: Int, promise: Promise) {
    manager.appUpdateInfo.addOnSuccessListener { info ->
      if (info.installStatus() != InstallStatus.DOWNLOADED) { promise.resolve(false); return@addOnSuccessListener }
      manager.completeUpdate().addOnSuccessListener { promise.resolve(true) }.addOnFailureListener { error -> reject(promise, error) }
    }.addOnFailureListener { error -> reject(promise, error) }
  }

  private fun reject(promise: Promise, error: Exception) {
    val code = (error as? InstallException)?.errorCode?.toString() ?: "UPDATE_FAILED"
    promise.reject(code, "Google Play update failed")
  }

  override fun invalidate() {
    if (initialized) manager.unregisterListener(listener)
    pending?.reject("UPDATE_INTERRUPTED", "Application closed")
    pending = null
    super.invalidate()
  }
}
