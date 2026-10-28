package com.radovpn.app

import android.annotation.SuppressLint
import android.app.Activity
import android.content.Intent
import android.net.VpnService
import android.os.Bundle
import android.webkit.*
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import android.widget.Toast

class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    private var currentConfig: String = ""

    private val vpnPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { result ->
        if (result.resultCode == Activity.RESULT_OK) {
            startVpn()
        } else {
            webView.evaluateJavascript("window.onVpnFailed && window.onVpnFailed('permission denied')", null)
            Toast.makeText(this, "دسترسی VPN رد شد", Toast.LENGTH_SHORT).show()
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        webView = WebView(this).apply {
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            settings.allowFileAccess = true
            settings.allowContentAccess = true
            settings.allowFileAccessFromFileURLs = true
            settings.allowUniversalAccessFromFileURLs = true
            settings.mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
            webChromeClient = WebChromeClient()
            webViewClient = object : WebViewClient() {
                override fun shouldOverrideUrlLoading(view: WebView?, request: WebResourceRequest?): Boolean {
                    return false
                }
            }
            addJavascriptInterface(VpnBridge(), "AndroidVpn")
        }
        
        setContentView(webView)
        webView.loadUrl("file:///android_asset/index.html")
    }

    inner class VpnBridge {
        @JavascriptInterface
        fun connect(config: String) {
            currentConfig = config
            runOnUiThread {
                val intent = VpnService.prepare(this@MainActivity)
                if (intent != null) {
                    vpnPermissionLauncher.launch(intent)
                } else {
                    startVpn()
                }
            }
        }

        @JavascriptInterface
        fun disconnect() {
            runOnUiThread {
                V2RayVpnService.stopVpn()
                webView.evaluateJavascript("window.onVpnDisconnected && window.onVpnDisconnected()", null)
            }
        }

        @JavascriptInterface
        fun getVersion(): String {
            return "1.0.0 - RadoVPN with Xray-core"
        }
    }

    private fun startVpn() {
        if (currentConfig.isBlank()) {
            Toast.makeText(this, "کانفیگی انتخاب نشده", Toast.LENGTH_SHORT).show()
            return
        }
        if (!isValidConfig(currentConfig)) {
            webView.evaluateJavascript("window.onVpnFailed && window.onVpnFailed('invalid config')", null)
            Toast.makeText(this, "کانفیگ نامعتبر است", Toast.LENGTH_SHORT).show()
            return
        }

        val intent = Intent(this, V2RayVpnService::class.java).apply {
            putExtra("config", currentConfig)
        }
        startService(intent)
        webView.evaluateJavascript("window.onVpnConnected && window.onVpnConnected()", null)
        Toast.makeText(this, "متصل شد", Toast.LENGTH_SHORT).show()
    }

    private fun isValidConfig(config: String): Boolean {
        if (config.length > 4000) return false
        val allowed = listOf("vmess://", "vless://", "trojan://", "ss://", "ssr://")
        if (allowed.none { config.startsWith(it) }) return false
        if (config.contains("javascript:", ignoreCase = true)) return false
        if (config.contains("<script", ignoreCase = true)) return false
        return true
    }

    override fun onBackPressed() {
        if (webView.canGoBack()) webView.goBack() else super.onBackPressed()
    }
}
