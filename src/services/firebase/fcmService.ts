/* eslint-disable curly */
import AsyncStorage from '@react-native-async-storage/async-storage';
import {PermissionsAndroid, Platform, Vibration, AppState} from 'react-native';
import {
  getMessaging,
  getToken,
  onTokenRefresh,
  subscribeToTopic,
  unsubscribeFromTopic,
  requestPermission,
  setBackgroundMessageHandler,
  onMessage,
} from '@react-native-firebase/messaging';
import {FCM_TOKEN_KEY} from '@env';
import axios from '../api/axios';
import PushNotification, {Importance} from 'react-native-push-notification';
import {NavigationService} from '../NavigationService';

export const RESPONDER_TOPIC = 'all_responders';
const messaging = getMessaging();
const ACTIVE_NOTIFICATIONS_KEY = 'active_notification_ids';

// Define notification types and their corresponding icons
const NOTIFICATION_ICONS = {
  critical: 'ic_critical_alert', // Custom icon in drawable folder
  high: 'ic_high_priority',
  medium: 'ic_medium_priority',
  low: 'ic_notification_default',
  default: 'ic_notification_default',
};

interface NotificationData {
  title?: string;
  message?: string;
  incidentId?: string;
  priority?: string;
  isCritical?: string;
  incident?: string;
  notificationType?: string; // Added to support different notification types
  [key: string]: any;
}

const VIBRATION_PATTERN = [1000, 2000, 3000];
let vibrationTimeout: number | null = null;
let openedViaNotification = false;

function playContinuousVibration() {
  stopVibration();
  Vibration.vibrate(VIBRATION_PATTERN, true);
  vibrationTimeout = setTimeout(stopVibration, 10000);
}

function stopVibration() {
  Vibration.cancel();
  if (vibrationTimeout) {
    clearTimeout(vibrationTimeout);
    vibrationTimeout = null;
  }
}

async function storeActiveNotification(id: number) {
  try {
    // Get the stored value or default to '[]' string
    const storedIds =
      (await AsyncStorage.getItem(ACTIVE_NOTIFICATIONS_KEY)) || '[]';
    const existingIds: number[] = JSON.parse(storedIds);

    if (!existingIds.includes(id)) {
      await AsyncStorage.setItem(
        ACTIVE_NOTIFICATIONS_KEY,
        JSON.stringify([...existingIds, id]),
      );
    }
  } catch (error) {
    console.error('Error storing notification:', error);
  }
}

async function removeActiveNotification(id: number) {
  try {
    const storedIds =
      (await AsyncStorage.getItem(ACTIVE_NOTIFICATIONS_KEY)) || '[]';
    const existingIds: number[] = JSON.parse(storedIds);
    const updatedIds = existingIds.filter(e => e !== id);

    await AsyncStorage.setItem(
      ACTIVE_NOTIFICATIONS_KEY,
      JSON.stringify(updatedIds),
    );
  } catch (error) {
    console.error('Error removing notification:', error);
  }
}

async function clearAllActiveNotifications() {
  try {
    await AsyncStorage.removeItem(ACTIVE_NOTIFICATIONS_KEY);
    stopVibration();
  } catch (error) {
    console.error('Error clearing notifications:', error);
  }
}

function configurePushNotifications() {
  // Create multiple channels for different priority levels
  PushNotification.createChannel(
    {
      channelId: 'incident_alerts',
      channelName: 'Critical Alerts',
      importance: Importance.HIGH,
      vibrate: true,
    },
    created => console.log(`Channel created: ${created}`),
  );

  PushNotification.createChannel(
    {
      channelId: 'high_priority',
      channelName: 'High Priority',
      importance: Importance.HIGH,
      vibrate: true,
    },
    created => console.log(`High priority channel created: ${created}`),
  );

  PushNotification.createChannel(
    {
      channelId: 'medium_priority',
      channelName: 'Medium Priority',
      importance: Importance.DEFAULT,
      vibrate: true,
    },
    created => console.log(`Medium priority channel created: ${created}`),
  );

  PushNotification.configure({
    onNotification: async notification => {
      stopVibration();
      const numericId = notification.id || 0;

      if (notification.userInteraction) {
        PushNotification.cancelLocalNotification(String(numericId));
        await removeActiveNotification(Number(numericId));
        openedViaNotification = true;

        try {
          const incident = notification.data?.incident
            ? JSON.parse(notification.data.incident)
            : notification.data?.incidentId
            ? {id: notification.data.incidentId}
            : null;

          if (incident) {
            NavigationService.navigateToIncidentDetails(incident);
          }
        } catch (error) {
          console.error('Navigation error:', error);
        }
      }

      if (Platform.OS === 'ios') {
        notification.finish?.('UIBackgroundFetchResultNoData');
      }
    },
    popInitialNotification: true,
    requestPermissions: false,
  });
}

async function checkActiveNotifications() {
  if (openedViaNotification) return;

  try {
    const existingIds = JSON.parse(
      (await AsyncStorage.getItem(ACTIVE_NOTIFICATIONS_KEY)) || '[]',
    );

    if (existingIds.length) {
      PushNotification.localNotification({
        channelId: 'incident_alerts',
        title: 'Pending Alerts',
        message: `${existingIds.length} unhandled alerts`,
        priority: 'high',
        smallIcon: NOTIFICATION_ICONS.high,
        largeIcon: NOTIFICATION_ICONS.high,
      });
    }
  } catch (error) {
    console.error('Notification check error:', error);
  }
}

export function displayNonDismissibleNotification(data: NotificationData) {
  const numericId = Math.floor(Math.random() * 1000000);
  storeActiveNotification(numericId);

  if (AppState.currentState !== 'active') {
    playContinuousVibration();
  }

  // Determine notification priority
  const isPriority = data.priority === 'high' || data.isCritical === 'true';
  const isCritical = data.isCritical === 'true';

  // Configure channel and icons
  let channelId = 'medium_priority';
  let iconType: keyof typeof NOTIFICATION_ICONS = 'default';

  if (isCritical) {
    channelId = 'incident_alerts';
    iconType = 'critical';
  } else if (isPriority) {
    channelId = 'high_priority';
    iconType = 'high';
  }

  // Base notification config
  const notificationConfig: Parameters<
    typeof PushNotification.localNotification
  >[0] = {
    channelId: channelId,
    title: data.title || 'Critical Alert',
    message: data.message || 'Immediate attention required',
    priority: 'high',
    soundName: isCritical ? 'critical_alert.mp3' : 'default',
    smallIcon: NOTIFICATION_ICONS[iconType],
    largeIcon: NOTIFICATION_ICONS[iconType],
    color: isCritical ? '#FF0000' : isPriority ? '#FFA500' : '#007AFF',
    actions: ['View'],
    userInfo: data,
    id: numericId,
  };

  // Platform-specific additions
  if (Platform.OS === 'android') {
    // Android-specific properties
    Object.assign(notificationConfig, {
      bigText: data.message || 'Immediate attention required',
      subText: isCritical ? 'CRITICAL' : isPriority ? 'HIGH PRIORITY' : '',
      largeIconUrl: NOTIFICATION_ICONS[iconType],
    });
  } else if (Platform.OS === 'ios') {
    // iOS-specific properties
    Object.assign(notificationConfig, {
      badge: 1,
    });
  }

  PushNotification.localNotification(notificationConfig);
}
export async function initializeFCM() {
  try {
    openedViaNotification = false;
    stopVibration();
    await checkActiveNotifications();

    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
      );
      if (granted !== PermissionsAndroid.RESULTS.GRANTED) return;
    }

    const authStatus = await requestPermission(messaging);
    if (![1, 2].includes(authStatus)) return;

    configurePushNotifications();

    const token = await getToken(messaging);
    if (token) await AsyncStorage.setItem(FCM_TOKEN_KEY, token);

    onTokenRefresh(messaging, async newToken => {
      await AsyncStorage.setItem(FCM_TOKEN_KEY, newToken);
      try {
        await axios.post('/auth/update-fcm-token', {fcmToken: newToken});
      } catch (error) {
        console.error('Token update failed:', error);
      }
    });

    const unsubscribe = onMessage(messaging, remoteMessage => {
      if (
        remoteMessage.data?.priority === 'high' ||
        remoteMessage.data?.isCritical === 'true'
      ) {
        displayNonDismissibleNotification(remoteMessage.data);
      }
    });

    AppState.addEventListener('change', nextAppState => {
      if (nextAppState === 'active') {
        stopVibration();
        openedViaNotification = false;
      }
    });

    return unsubscribe;
  } catch (error) {
    console.error('FCM initialization failed:', error);
  }
}

export async function subscribeToResponderTopic() {
  try {
    await subscribeToTopic(messaging, RESPONDER_TOPIC);
    return true;
  } catch (error) {
    console.error('Topic subscription failed:', error);
    return false;
  }
}

export async function unsubscribeFromResponderTopic() {
  try {
    await unsubscribeFromTopic(messaging, RESPONDER_TOPIC);
    return true;
  } catch (error) {
    console.error('Topic unsubscription failed:', error);
    return false;
  }
}

export async function clearAllNotifications() {
  PushNotification.cancelAllLocalNotifications();
  await clearAllActiveNotifications();
  stopVibration();
}

setBackgroundMessageHandler(messaging, remoteMessage => {
  if (
    remoteMessage.data?.priority === 'high' ||
    remoteMessage.data?.isCritical === 'true'
  ) {
    displayNonDismissibleNotification(remoteMessage.data);
  }
  return Promise.resolve();
});
