/**
 * src/services/notification.service.js
 *
 * Emergency SOS and Push Notification handler.
 * Dynamically interfaces with @react-native-firebase/messaging so the
 * app continues running normally even before Firebase packages or
 * google-services.json are linked.
 */
import { Platform, PermissionsAndroid, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { residentsAPI } from './api';

const FCM_TOKEN_STORAGE_KEY = '@falo_fcm_token';

// ─── Real-time SOS Pub/Sub Listener ──────────────────────────────────────────
const sosListeners = new Set();

/**
 * Register a listener to be notified when an SOS event occurs in real-time
 * (e.g. Foreground push received, trigger dispatched, status change)
 * @returns {Function} unsubscribe function
 */
export function onSosAlertReceived(callback) {
  if (typeof callback === 'function') {
    sosListeners.add(callback);
    return () => sosListeners.delete(callback);
  }
  return () => {};
}

/**
 * Broadcast an SOS event to all registered screens/components
 */
export function notifySosListeners(data) {
  sosListeners.forEach((cb) => {
    try {
      cb(data);
    } catch (err) {
      console.warn('⚠️ [SOS Listener] Error invoking callback:', err);
    }
  });
}

let messaging = null;
try {
  const mod = require('@react-native-firebase/messaging');
  messaging = mod.default || mod;
} catch (_) {
  // @react-native-firebase/messaging not installed or linked yet
}

/**
 * Request notification permissions (Android 13+ & iOS)
 */
export async function requestNotificationPermission() {
  try {
    if (Platform.OS === 'android' && Platform.Version >= 33) {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
      );
      if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
        console.log('⚠️ [Notifications] Android POST_NOTIFICATIONS permission denied');
        return false;
      }
    }

    if (messaging) {
      const authStatus = await messaging().requestPermission();
      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;
      return enabled;
    }

    return true;
  } catch (err) {
    console.warn('⚠️ [Notifications] Permission request error:', err.message);
    return false;
  }
}

/**
 * Retrieves the device's FCM token and registers it with the backend
 */
export async function registerDeviceToken() {
  if (!messaging) {
    console.log('ℹ️  [Notifications] Firebase messaging module not installed or linked yet. Please run: npm install in falomobileapp');
    return null;
  }

  try {
    const hasPermission = await requestNotificationPermission();
    if (!hasPermission) {
      console.warn('⚠️ [Notifications] Notification permission was not granted by user.');
      return null;
    }

    // Register device with FCM
    if (Platform.OS === 'ios') {
      await messaging().registerDeviceForRemoteMessages();
    }

    const token = await messaging().getToken();
    if (!token) {
      console.warn('⚠️ [Notifications] Failed to retrieve FCM token from device.');
      return null;
    }

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('🔥 [FCM DEVICE TOKEN]:');
    console.log(token);
    console.log('═══════════════════════════════════════════════════════════════\n');

    // Save token to backend database for the logged-in user
    try {
      await residentsAPI.saveFcmToken(token);
      await AsyncStorage.setItem(FCM_TOKEN_STORAGE_KEY, token);
      console.log('✅ [Notifications] Registered FCM Token with backend successfully.');
    } catch (saveErr) {
      console.warn('⚠️ [Notifications] Could not save token to backend:', saveErr?.response?.data?.message || saveErr.message);
    }

    // Listen for future token refreshes (e.g. app restore or token rotation)
    messaging().onTokenRefresh(async (newToken) => {
      try {
        console.log('🔄 [Notifications] Refreshed FCM token received:', newToken);
        await residentsAPI.saveFcmToken(newToken);
        await AsyncStorage.setItem(FCM_TOKEN_STORAGE_KEY, newToken);
      } catch (err) {
        console.warn('⚠️ [Notifications] Failed to save refreshed token:', err.message);
      }
    });

    return token;
  } catch (err) {
    console.warn('⚠️ [Notifications] Token registration failed:', err.message);
    return null;
  }
}

/**
 * Deregisters the FCM token upon user logout
 */
export async function unregisterDeviceToken() {
  try {
    const token = await AsyncStorage.getItem(FCM_TOKEN_STORAGE_KEY);
    if (token) {
      await residentsAPI.removeFcmToken(token);
      await AsyncStorage.removeItem(FCM_TOKEN_STORAGE_KEY);
      console.log('ℹ️  [Notifications] FCM token deregistered on logout.');
    }
  } catch (err) {
    console.warn('⚠️ [Notifications] Error deregistering token:', err.message);
  }
}

/**
 * Sets up incoming notification handlers (Foreground, Background, Quit State)
 */
export function setupNotificationListeners(navigationRef) {
  if (!messaging) return () => {};

  // 1. Foreground notification (app is currently active on screen)
  const unsubscribeForeground = messaging().onMessage(async (remoteMessage) => {
    console.log('📬 [FCM Foreground Notification]', remoteMessage);
    const { title, body } = remoteMessage.notification || {};
    const { type, alertId, flatNo, emergencyType } = remoteMessage.data || {};

    // Immediately notify all active screens (Dashboards, Emergency monitor) to update SOS banner without refresh
    notifySosListeners(remoteMessage.data);

    const alertTitle = title || (flatNo ? `🚨 EMERGENCY SOS: Flat ${flatNo}` : '🚨 EMERGENCY SOS');
    const alertBody  = body || `${emergencyType || 'Urgent'} emergency alert reported in your society!`;

    Alert.alert(
      alertTitle,
      alertBody,
      [
        { text: 'Dismiss', style: 'cancel' },
        {
          text: 'View Emergency',
          onPress: () => {
            if (navigationRef?.isReady?.()) {
              navigationRef.navigate('SosEmergency', { alertId });
            }
          },
        },
      ],
      { cancelable: false }
    );
  });

  // 2. Background notification tap (user taps notification in tray while app was minimised)
  const unsubscribeOpenedApp = messaging().onNotificationOpenedApp((remoteMessage) => {
    console.log('📱 [FCM Notification Tap (Background)]', remoteMessage?.data);
    notifySosListeners(remoteMessage?.data);
    if (navigationRef?.isReady?.()) {
      navigationRef.navigate('SosEmergency', { alertId: remoteMessage?.data?.alertId });
    }
  });

  // 3. Cold start notification tap (app was completely closed / killed)
  messaging()
    .getInitialNotification()
    .then((remoteMessage) => {
      if (remoteMessage) {
        console.log('📱 [FCM Notification Tap (Killed State)]', remoteMessage?.data);
        notifySosListeners(remoteMessage?.data);
        setTimeout(() => {
          if (navigationRef?.isReady?.()) {
            navigationRef.navigate('SosEmergency', { alertId: remoteMessage?.data?.alertId });
          }
        }, 1200);
      }
    })
    .catch((err) => console.warn('⚠️ [Notifications] Initial notification error:', err.message));

  return () => {
    unsubscribeForeground();
    unsubscribeOpenedApp();
  };
}
