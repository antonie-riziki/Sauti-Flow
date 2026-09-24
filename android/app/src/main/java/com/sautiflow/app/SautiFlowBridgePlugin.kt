package com.sautiflow.app

import android.Manifest
import android.content.ActivityNotFoundException
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.provider.ContactsContract
import android.provider.Settings
import android.telephony.TelephonyManager
import android.util.Log
import androidx.core.content.ContextCompat
import com.getcapacitor.JSArray
import com.getcapacitor.JSObject
import com.getcapacitor.PermissionState
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.annotation.CapacitorPlugin
import com.getcapacitor.annotation.Permission
import com.getcapacitor.annotation.PermissionCallback
import com.getcapacitor.annotation.PluginMethod

@CapacitorPlugin(
    name = "SautiFlowBridge",
    permissions = [
        Permission(alias = "contacts", strings = [Manifest.permission.READ_CONTACTS]),
        Permission(alias = "call", strings = [Manifest.permission.CALL_PHONE]),
        Permission(alias = "sms", strings = [Manifest.permission.SEND_SMS])
    ]
)
class SautiFlowBridgePlugin : Plugin() {
    companion object {
        private const val TAG = "SAUTIFLOW_BRIDGE"
        private const val VERSION = "0.1.0"
        private val TRUSTED_PACKAGES = mapOf(
            "com.whatsapp" to "whatsapp",
            "com.facebook.orca" to "messenger",
            "com.google.android.apps.messaging" to "messages"
        )
    }

    @PluginMethod
    fun getStatus(call: PluginCall) {
        val result = JSObject()
        result.put("success", true)
        result.put("connected", true)
        result.put("platform", "android")
        result.put("version", VERSION)
        result.put("capabilities", JSObject().apply {
            put("openApp", true); put("openDialer", true); put("makeCall", true)
            put("composeSms", true); put("composeWhatsApp", isInstalled("com.whatsapp"))
            put("executeUssd", Build.VERSION.SDK_INT >= Build.VERSION_CODES.O)
            put("contacts", true); put("accessibility", accessibilityEnabled())
        })
        result.put("installedApps", JSObject().apply {
            put("whatsapp", isInstalled("com.whatsapp")); put("messenger", isInstalled("com.facebook.orca")); put("messages", isInstalled("com.google.android.apps.messaging"))
        })
        result.put("permissions", JSObject().apply {
            put("callPhone", hasPermission(Manifest.permission.CALL_PHONE)); put("readContacts", hasPermission(Manifest.permission.READ_CONTACTS)); put("sendSms", hasPermission(Manifest.permission.SEND_SMS)); put("accessibility", accessibilityEnabled())
        })
        Log.d(TAG, "bridge status requested")
        call.resolve(result)
    }

    @PluginMethod
    fun openApp(call: PluginCall) {
        val packageName = call.getString("packageName")?.trim()
        if (packageName.isNullOrEmpty() || !TRUSTED_PACKAGES.containsKey(packageName)) return reject(call, "INVALID_PACKAGE", "This application is not in SautiFlow's trusted app registry.")
        launchPackage(call, packageName)
    }

    @PluginMethod
    fun openDialer(call: PluginCall) {
        val value = call.getString("value")?.trim().orEmpty()
        if (value.isNotEmpty() && !validPhone(value) && !validUssd(value)) return reject(call, "INVALID_DIAL_VALUE", "The dialer value is not a valid phone number or USSD code.")
        try {
            val intent = if (value.isEmpty()) Intent(Intent.ACTION_DIAL) else Intent(Intent.ACTION_DIAL, Uri.fromParts("tel", value, null))
            startActivity(intent)
            call.resolve(success("phone.open_dialer", if (value.isEmpty()) "Dialer opened." else "Dialer opened with $value ready. Tap Call to connect.").apply { if (value.isNotEmpty()) put("value", value); put("status", "DIALER_OPENED") })
        } catch (_: ActivityNotFoundException) { reject(call, "DIALER_UNAVAILABLE", "No Android dialer is available on this device.") }
    }

    @PluginMethod
    fun makeCall(call: PluginCall) {
        val phoneNumber = normalizePhone(call.getString("phoneNumber"))
        if (!validPhone(phoneNumber)) return reject(call, "INVALID_PHONE_NUMBER", "A valid phone number is required.")
        try {
            startActivity(Intent(Intent.ACTION_DIAL, Uri.fromParts("tel", phoneNumber, null)))
            call.resolve(success("phone.make_call", "Dialer opened with $phoneNumber ready. Tap Call to connect.").apply { put("status", "DIALER_OPENED") })
        } catch (_: ActivityNotFoundException) { reject(call, "DIALER_UNAVAILABLE", "No Android dialer is available on this device.") }
    }

    @PluginMethod
    fun composeSms(call: PluginCall) {
        val recipient = normalizePhone(call.getString("recipient"))
        val message = call.getString("message").orEmpty()
        if (!validPhone(recipient)) return reject(call, "INVALID_PHONE_NUMBER", "A valid phone number is required for a new SMS conversation.")
        try {
            val intent = Intent(Intent.ACTION_SENDTO, Uri.parse("smsto:${Uri.encode(recipient)}"))
            intent.putExtra("sms_body", message)
            startActivity(intent)
            call.resolve(success("sms.compose", "SMS conversation opened with the message ready. Tap Send to send it.").apply { put("status", "SMS_COMPOSER_OPENED") })
        } catch (_: ActivityNotFoundException) { reject(call, "MESSAGES_UNAVAILABLE", "No Android messaging application is available.") }
    }

    @PluginMethod
    fun composeWhatsApp(call: PluginCall) {
        val phoneNumber = normalizePhone(call.getString("phoneNumber"))
        val message = call.getString("message").orEmpty()
        if (!validPhone(phoneNumber)) return reject(call, "INVALID_PHONE_NUMBER", "A valid phone number is required for a WhatsApp conversation.")
        if (!isInstalled("com.whatsapp")) return reject(call, "APP_NOT_INSTALLED", "WhatsApp is not installed on this phone.")
        try {
            val digits = phoneNumber.removePrefix("+")
            val intent = Intent(Intent.ACTION_VIEW, Uri.parse("https://wa.me/$digits?text=${Uri.encode(message)}"))
            intent.setPackage("com.whatsapp")
            startActivity(intent)
            call.resolve(success("whatsapp.compose", "WhatsApp conversation opened with the message ready. Tap Send to send it.").apply { put("status", "WHATSAPP_COMPOSER_OPENED") })
        } catch (_: ActivityNotFoundException) { reject(call, "WHATSAPP_UNAVAILABLE", "WhatsApp could not open a conversation for this number.") }
    }

    @PluginMethod
    fun executeUssd(call: PluginCall) {
        val code = call.getString("code")?.trim().orEmpty()
        if (!validUssd(code)) return reject(call, "INVALID_USSD", "The USSD code is not valid or trusted.")
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return reject(call, "USSD_UNSUPPORTED", "Native USSD requests require Android 8.0 or newer.")
        if (getPermissionState("call") != PermissionState.GRANTED) {
            requestPermissionForAlias("call", call, "ussdPermissionCallback")
            return
        }
        performUssd(call, code)
    }

    @PermissionCallback
    private fun ussdPermissionCallback(call: PluginCall) {
        if (getPermissionState("call") == PermissionState.GRANTED) performUssd(call, call.getString("code").orEmpty())
        else reject(call, "CALL_PERMISSION_REQUIRED", "Phone permission is required before Android can request USSD.")
    }

    private fun performUssd(call: PluginCall, code: String) {
        try {
            val telephony = context.getSystemService(Context.TELEPHONY_SERVICE) as TelephonyManager
            Log.d(TAG, "USSD request started")
            telephony.sendUssdRequest(code, object : TelephonyManager.UssdResponseCallback() {
                override fun onReceiveUssdResponse(telephonyManager: TelephonyManager, request: String, response: String) {
                    call.resolve(success("ussd.execute", "USSD response received.").apply { put("code", request); put("status", "USSD_EXECUTED"); put("response", response) })
                }

                override fun onReceiveUssdResponseFailed(telephonyManager: TelephonyManager, request: String, failureCode: Int) {
                    reject(call, "USSD_REQUEST_FAILED", "The network rejected the USSD request.", JSObject().apply { put("code", request); put("failureCode", failureCode) })
                }
            }, Handler(Looper.getMainLooper()))
        } catch (_: SecurityException) { reject(call, "CALL_PERMISSION_REQUIRED", "Phone permission is required before Android can request USSD.") }
        catch (_: Exception) { reject(call, "UNKNOWN_ERROR", "Android could not start the USSD request.") }
    }

    @PluginMethod
    fun searchContacts(call: PluginCall) {
        if (getPermissionState("contacts") != PermissionState.GRANTED) {
            requestPermissionForAlias("contacts", call, "contactsPermissionCallback")
            return
        }
        performContactSearch(call, call.getString("name").orEmpty())
    }

    @PermissionCallback
    private fun contactsPermissionCallback(call: PluginCall) {
        if (getPermissionState("contacts") == PermissionState.GRANTED) performContactSearch(call, call.getString("name").orEmpty())
        else reject(call, "CONTACTS_PERMISSION_REQUIRED", "Contacts permission is required to search for a person.")
    }

    private fun performContactSearch(call: PluginCall, name: String) {
        val matches = JSArray()
        val cursor = context.contentResolver.query(
            ContactsContract.CommonDataKinds.Phone.CONTENT_URI,
            arrayOf(ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME, ContactsContract.CommonDataKinds.Phone.NUMBER),
            "${ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME} LIKE ?",
            arrayOf("%$name%"),
            "${ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME} COLLATE NOCASE ASC"
        )
        cursor?.use {
            val nameIndex = it.getColumnIndex(ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME)
            val numberIndex = it.getColumnIndex(ContactsContract.CommonDataKinds.Phone.NUMBER)
            while (it.moveToNext()) matches.put(JSObject().apply { put("name", it.getString(nameIndex)); put("phoneNumber", it.getString(numberIndex)) })
        }
        Log.d(TAG, "contact search completed")
        call.resolve(success("contacts.search", "Contact search completed.").apply { put("matches", matches); put("ambiguous", matches.length() > 1) })
    }

    @PluginMethod
    fun getAccessibilityStatus(call: PluginCall) {
        call.resolve(success("accessibility.status", "Accessibility status read.").apply { put("enabled", accessibilityEnabled()) })
    }

    private fun launchPackage(call: PluginCall, packageName: String) {
        if (!isInstalled(packageName)) return reject(call, "APP_NOT_INSTALLED", "${TRUSTED_PACKAGES[packageName]?.replaceFirstChar { it.uppercase() }} is not installed on this phone.")
        val launchIntent = packageManager.getLaunchIntentForPackage(packageName) ?: return reject(call, "APP_NOT_LAUNCHABLE", "The installed application cannot be opened.")
        try {
            startActivity(launchIntent)
            call.resolve(success("app.open", "${TRUSTED_PACKAGES[packageName]?.replaceFirstChar { it.uppercase() }} opened.").apply { put("packageName", packageName); put("status", "APP_OPENED") })
        } catch (_: ActivityNotFoundException) { reject(call, "APP_NOT_LAUNCHABLE", "The installed application cannot be opened.") }
    }

    private fun isInstalled(packageName: String) = try { packageManager.getApplicationInfo(packageName, 0); true } catch (_: PackageManager.NameNotFoundException) { false }
    private fun hasPermission(permission: String) = ContextCompat.checkSelfPermission(context, permission) == PackageManager.PERMISSION_GRANTED
    private fun accessibilityEnabled(): Boolean {
        val enabled = Settings.Secure.getString(context.contentResolver, Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES) ?: return false
        val expected = "${context.packageName}/${SautiFlowAccessibilityService::class.java.name}"
        return enabled.split(':').any { it.equals(expected, ignoreCase = true) }
    }
    private fun normalizePhone(value: String?) = value.orEmpty().trim().replace(" ", "").replace("-", "")
    private fun validPhone(value: String) = Regex("^\\+?[0-9]{7,15}$").matches(value)
    private fun validUssd(value: String) = Regex("^\\*[0-9*]+#$").matches(value)
    private fun success(tool: String, message: String) = JSObject().apply { put("success", true); put("tool", tool); put("message", message) }
    private fun reject(call: PluginCall, code: String, message: String, extra: JSObject? = null) { val result = extra ?: JSObject(); result.put("success", false); result.put("errorCode", code); result.put("message", message); call.reject(message, code, null, result) }
}
