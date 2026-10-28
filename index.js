/**
 * @format
 */

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

// Register background message handler for when app is killed or minimised
try {
  const messaging = require('@react-native-firebase/messaging').default;
  messaging().setBackgroundMessageHandler(async (remoteMessage) => {
    console.log('🚨 [FCM Background SOS]', remoteMessage?.notification?.title || remoteMessage?.data);
  });
} catch (_) {}

AppRegistry.registerComponent(appName, () => App);
