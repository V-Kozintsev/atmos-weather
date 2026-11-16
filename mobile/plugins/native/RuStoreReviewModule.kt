package ru.puskweb.atmos

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.uimanager.ViewManager
import ru.rustore.sdk.review.RuStoreReviewManager
import ru.rustore.sdk.review.RuStoreReviewManagerFactory
import ru.rustore.sdk.review.model.ReviewInfo

class RuStoreReviewPackage : ReactPackage {
  override fun createNativeModules(context: ReactApplicationContext): List<NativeModule> = listOf(RuStoreReviewModule(context))
  override fun createViewManagers(context: ReactApplicationContext): List<ViewManager<*, *>> = emptyList()
}

/** Оценка приложения в шторке RuStore без перехода в магазин. Частоту показа ограничивает сам RuStore. */
class RuStoreReviewModule(private val context: ReactApplicationContext) : ReactContextBaseJavaModule(context) {
  private val manager: RuStoreReviewManager by lazy { RuStoreReviewManagerFactory.create(context) }
  private var info: ReviewInfo? = null

  override fun getName() = "RuStoreReview"

  /** Заранее получает reviewInfo, чтобы шторка открылась мгновенно. Ошибку не показываем: оценка не должна мешать. */
  @ReactMethod
  fun prepare(promise: Promise) {
    if (info != null) { promise.resolve(true); return }
    try {
      manager.requestReviewFlow()
        .addOnSuccessListener { reviewInfo -> info = reviewInfo; promise.resolve(true) }
        .addOnFailureListener { promise.resolve(false) }
    } catch (error: Throwable) {
      promise.resolve(false)
    }
  }

  /** Показывает шторку оценки; при отсутствии RuStore или исчерпанном лимите возвращает ошибку для запасного перехода в магазин. */
  @ReactMethod
  fun launch(promise: Promise) {
    val ready = info
    if (ready != null) { launchWith(ready, promise); return }
    try {
      manager.requestReviewFlow()
        .addOnSuccessListener { reviewInfo -> launchWith(reviewInfo, promise) }
        .addOnFailureListener { error -> promise.reject("REVIEW_UNAVAILABLE", error.javaClass.simpleName) }
    } catch (error: Throwable) {
      promise.reject("REVIEW_UNAVAILABLE", error.javaClass.simpleName)
    }
  }

  private fun launchWith(reviewInfo: ReviewInfo, promise: Promise) {
    info = null
    manager.launchReviewFlow(reviewInfo)
      .addOnSuccessListener { promise.resolve("completed") }
      .addOnFailureListener { error -> promise.reject("REVIEW_FAILED", error.javaClass.simpleName) }
  }
}
