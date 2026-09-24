package com.sautiflow.app

import android.accessibilityservice.AccessibilityService
import android.util.Log
import android.view.accessibility.AccessibilityEvent

class SautiFlowAccessibilityService : AccessibilityService() {
    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        // Do not log text or message contents. This service is opt-in and currently a foundation only.
        if (event?.eventType == AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED) Log.d("SAUTIFLOW_BRIDGE", "foreground application changed")
    }

    override fun onInterrupt() = Unit
}
