/**
 * @format
 */

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

// Safe background message handler initialization
try {
  const fbMessaging = require('@react-native-firebase/messaging');
  const messaging = fbMessaging ? (fbMessaging.default || fbMessaging) : null;
  if (typeof messaging === 'function') {
    try {
      const instance = messaging();
      if (instance && typeof instance.setBackgroundMessageHandler === 'function') {
        instance.setBackgroundMessageHandler(async (remoteMessage) => {
          console.log('🚨 [FCM Background SOS]', remoteMessage?.notification?.title || remoteMessage?.data);
        });
      }
    } catch (_) {
      // Firebase native app not configured yet (e.g. missing GoogleService-Info.plist)
    }
  }
} catch (_) {
  // @react-native-firebase/messaging not installed or available
}

AppRegistry.registerComponent(appName, () => App);
