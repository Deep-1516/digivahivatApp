package com.falomobileapp

import android.app.Application
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.ContentResolver
import android.content.Context
import android.media.AudioAttributes
import android.media.RingtoneManager
import android.net.Uri
import android.os.Build
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost

class MainApplication : Application(), ReactApplication {

  override val reactHost: ReactHost by lazy {
    getDefaultReactHost(
      context = applicationContext,
      packageList =
        PackageList(this).packages.apply {
          add(NotificationSoundPackage())
        },
    )
  }

  override fun onCreate() {
    super.onCreate()
    loadReactNative(this)
    createEmergencyNotificationChannels()
  }

  private fun createEmergencyNotificationChannels() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

      // Locate custom emergency siren audio resource in res/raw/sos_alarm
      val rawResId = resources.getIdentifier("sos_alarm", "raw", packageName)
      val soundUri: Uri = if (rawResId != 0) {
        Uri.parse("${ContentResolver.SCHEME_ANDROID_RESOURCE}://$packageName/$rawResId")
      } else {
        RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM)
          ?: RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)
      }

      val audioAttributes = AudioAttributes.Builder()
        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
        .setUsage(AudioAttributes.USAGE_ALARM)
        .build()

      // Primary Channel with Siren Sound
      val channelSiren = NotificationChannel(
        "emergency_sos_alarm",
        "🚨 Emergency SOS Alarm",
        NotificationManager.IMPORTANCE_HIGH
      ).apply {
        description = "High priority emergency siren alerts for society SOS incidents"
        enableVibration(true)
        vibrationPattern = longArrayOf(0, 600, 250, 600, 250, 600)
        setSound(soundUri, audioAttributes)
        setBypassDnd(true)
      }
      notificationManager.createNotificationChannel(channelSiren)

      // Fallback channel (updating older channel with sound attributes)
      val channelFallback = NotificationChannel(
        "emergency_sos",
        "Emergency SOS Alerts",
        NotificationManager.IMPORTANCE_HIGH
      ).apply {
        description = "High priority emergency notifications for society SOS crises"
        enableVibration(true)
        vibrationPattern = longArrayOf(0, 600, 250, 600, 250, 600)
        setSound(soundUri, audioAttributes)
      }
      notificationManager.createNotificationChannel(channelFallback)

      // General Society Notifications (Notices, Visitor arrivals, Receipts, Complaints, Events)
      val channelGeneral = NotificationChannel(
        "society_general",
        "📢 Society Announcements & Updates",
        NotificationManager.IMPORTANCE_HIGH
      ).apply {
        description = "Notices, visitor arrivals, receipts, and complaint updates"
        enableVibration(true)
      }
      notificationManager.createNotificationChannel(channelGeneral)
    }
  }
}
