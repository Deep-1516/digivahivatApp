package com.falomobileapp

import android.app.DownloadManager
import android.content.ContentResolver
import android.content.Context
import android.content.Intent
import android.media.AudioAttributes
import android.media.MediaPlayer
import android.media.RingtoneManager
import android.net.Uri
import android.os.Environment
import android.util.Base64
import androidx.core.content.FileProvider
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.google.mlkit.vision.codescanner.GmsBarcodeScanner
import com.google.mlkit.vision.codescanner.GmsBarcodeScannerOptions
import com.google.mlkit.vision.codescanner.GmsBarcodeScanning
import com.google.mlkit.vision.barcode.common.Barcode
import java.io.File
import java.io.FileOutputStream

class NotificationSoundModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    private var mediaPlayer: MediaPlayer? = null

    override fun getName(): String = "NotificationSound"

    @ReactMethod
    fun playEmergencySound() {
        try {
            stopEmergencySound()

            val rawResId = reactContext.resources.getIdentifier("sos_alarm", "raw", reactContext.packageName)
            val soundUri: Uri = if (rawResId != 0) {
                Uri.parse("${ContentResolver.SCHEME_ANDROID_RESOURCE}://${reactContext.packageName}/$rawResId")
            } else {
                RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM)
                    ?: RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)
            }

            mediaPlayer = MediaPlayer().apply {
                setAudioAttributes(
                    AudioAttributes.Builder()
                        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                        .setUsage(AudioAttributes.USAGE_ALARM)
                        .build()
                )
                setDataSource(reactContext, soundUri)
                isLooping = false
                prepare()
                start()
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    @ReactMethod
    fun stopEmergencySound() {
        try {
            mediaPlayer?.let {
                if (it.isPlaying) {
                    it.stop()
                }
                it.release()
            }
            mediaPlayer = null
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    /**
     * Shares the QR code image attachment + pass details directly into WhatsApp
     */
    @ReactMethod
    fun shareQrToWhatsApp(base64Image: String, messageText: String, promise: Promise) {
        try {
            val cleanBase64 = if (base64Image.contains(",")) {
                base64Image.substringAfter(",")
            } else {
                base64Image
            }
            val imageBytes = Base64.decode(cleanBase64, Base64.DEFAULT)

            val imagesFolder = File(reactContext.cacheDir, "images")
            if (!imagesFolder.exists()) {
                imagesFolder.mkdirs()
            }
            val file = File(imagesFolder, "gate_pass_qr.png")
            val stream = FileOutputStream(file)
            stream.write(imageBytes)
            stream.flush()
            stream.close()

            val contentUri: Uri = FileProvider.getUriForFile(
                reactContext,
                "${reactContext.packageName}.provider",
                file
            )

            val shareIntent = Intent(Intent.ACTION_SEND).apply {
                type = "image/png"
                putExtra(Intent.EXTRA_STREAM, contentUri)
                putExtra(Intent.EXTRA_TEXT, messageText)
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }

            val pm = reactContext.packageManager
            val isWhatsAppInstalled = pm.getLaunchIntentForPackage("com.whatsapp") != null
            val isW4bInstalled = pm.getLaunchIntentForPackage("com.whatsapp.w4b") != null

            if (isWhatsAppInstalled) {
                shareIntent.setPackage("com.whatsapp")
                reactContext.startActivity(shareIntent)
            } else if (isW4bInstalled) {
                shareIntent.setPackage("com.whatsapp.w4b")
                reactContext.startActivity(shareIntent)
            } else {
                val chooser = Intent.createChooser(shareIntent, "Share Gate Pass QR Code").apply {
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                reactContext.startActivity(chooser)
            }

            promise.resolve(true)
        } catch (e: Exception) {
            e.printStackTrace()
            promise.reject("SHARE_ERROR", e.message, e)
        }
    }

    /**
     * Shares the QR code image attachment + pass details to any app (chooser)
     */
    @ReactMethod
    fun shareQrGeneral(base64Image: String, messageText: String, promise: Promise) {
        try {
            val cleanBase64 = if (base64Image.contains(",")) {
                base64Image.substringAfter(",")
            } else {
                base64Image
            }
            val imageBytes = Base64.decode(cleanBase64, Base64.DEFAULT)

            val imagesFolder = File(reactContext.cacheDir, "images")
            if (!imagesFolder.exists()) {
                imagesFolder.mkdirs()
            }
            val file = File(imagesFolder, "gate_pass_qr.png")
            val stream = FileOutputStream(file)
            stream.write(imageBytes)
            stream.flush()
            stream.close()

            val contentUri: Uri = FileProvider.getUriForFile(
                reactContext,
                "${reactContext.packageName}.provider",
                file
            )

            val shareIntent = Intent(Intent.ACTION_SEND).apply {
                type = "image/png"
                putExtra(Intent.EXTRA_STREAM, contentUri)
                putExtra(Intent.EXTRA_TEXT, messageText)
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }

            val chooser = Intent.createChooser(shareIntent, "Share Gate Pass QR Code").apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            reactContext.startActivity(chooser)
            promise.resolve(true)
        } catch (e: Exception) {
            e.printStackTrace()
            promise.reject("SHARE_ERROR", e.message, e)
        }
    }

    /**
     * Downloads any file (e.g. PDF Receipt) in the background directly using
     * Android DownloadManager without redirecting to a browser!
     */
    @ReactMethod
    fun downloadFile(url: String, fileName: String, description: String, mimeType: String, promise: Promise) {
        try {
            val downloadManager = reactContext.getSystemService(Context.DOWNLOAD_SERVICE) as DownloadManager
            val uri = Uri.parse(url)

            val request = DownloadManager.Request(uri).apply {
                setTitle(fileName)
                setDescription(description)
                setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED)
                setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, fileName)
                setMimeType(mimeType)
                setAllowedOverMetered(true)
                setAllowedOverRoaming(true)
            }

            val downloadId = downloadManager.enqueue(request)
            promise.resolve(downloadId.toString())
        } catch (e: Exception) {
            e.printStackTrace()
            promise.reject("DOWNLOAD_ERROR", e.message, e)
        }
    }

    /**
     * Launches Google Play Services Code Scanner UI.
     * Uses device camera to scan QR codes with auto-focus, zoom and returns decoded string.
     */
    @ReactMethod
    fun scanQrCode(promise: Promise) {
        val currentAct = reactContext.currentActivity
        if (currentAct == null) {
            promise.reject("NO_ACTIVITY", "Current activity is null. Cannot launch QR Scanner.")
            return
        }

        currentAct.runOnUiThread {
            try {
                val options = GmsBarcodeScannerOptions.Builder()
                    .setBarcodeFormats(Barcode.FORMAT_QR_CODE)
                    .enableAutoZoom()
                    .build()

                val scanner: GmsBarcodeScanner = GmsBarcodeScanning.getClient(currentAct, options)
                scanner.startScan()
                    .addOnSuccessListener { barcode: Barcode ->
                        val rawValue = barcode.rawValue ?: barcode.displayValue ?: ""
                        promise.resolve(rawValue)
                    }
                    .addOnCanceledListener {
                        promise.reject("CANCELLED", "User cancelled scan")
                    }
                    .addOnFailureListener { e: Exception ->
                        promise.reject("SCAN_FAILED", e.message ?: "Failed to scan QR code")
                    }
            } catch (e: Exception) {
                promise.reject("UNAVAILABLE", e.message ?: "Google Code Scanner is unavailable")
            }
        }
    }
}
