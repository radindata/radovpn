package com.radovpn.app

import android.content.Intent
import android.net.VpnService
import android.os.ParcelFileDescriptor
import android.util.Log

class V2RayVpnService : VpnService() {

    companion object {
        private var instance: V2RayVpnService? = null
        fun stopVpn() {
            instance?.stopSelf()
            instance?.closeTun()
        }
    }

    private var tunFd: ParcelFileDescriptor? = null
    private var isRunning = false

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val config = intent?.getStringExtra("config") ?: return START_NOT_STICKY
        instance = this
        
        try {
            startVpnWithConfig(config)
        } catch (e: Exception) {
            Log.e("RadoVPN", "VPN start failed", e)
            stopSelf()
        }
        return START_STICKY
    }

    private fun startVpnWithConfig(config: String) {
        // برای نسخه نهایی: libv2ray.aar را از v2rayNG دانلود کن
        // val core = Libv2ray.newV2RayPoint()
        // core.configure(... build json from config ...)
        // core.runLoop()

        val builder = Builder()
            .addAddress("10.111.0.1", 32)
            .addRoute("0.0.0.0", 0)
            .addDnsServer("1.1.1.1")
            .addDnsServer("8.8.8.8")
            .setMtu(1500)
            .setSession("RadoVPN")
            .setBlocking(false)

        tunFd = builder.establish()
        isRunning = true
        
        Thread {
            try {
                while (isRunning) {
                    Thread.sleep(100)
                }
            } catch (e: Exception) {
                Log.e("RadoVPN", "Tunnel error", e)
            }
        }.start()
    }

    private fun closeTun() {
        isRunning = false
        try { tunFd?.close() } catch (e: Exception) {}
        tunFd = null
    }

    override fun onDestroy() {
        closeTun()
        super.onDestroy()
    }

    override fun onRevoke() {
        closeTun()
        super.onRevoke()
    }
}
