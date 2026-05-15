import React, { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';

export default function NotificationHandler() {
  const notificationListener = useRef<Notifications.Subscription | null>(null);
  const responseListener = useRef<Notifications.Subscription | null>(null);
  const router = useRouter();

  useEffect(() => {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });

    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      // notification received (foreground)
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      if (data?.targetRoute) {
        router.push(data.targetRoute as string);
      }
    });

    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, []);

  return null;
}
