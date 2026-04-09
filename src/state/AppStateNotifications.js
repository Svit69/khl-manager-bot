const NOTIFICATION_PRIORITY_BY_TYPE = Object.freeze({
  upgrade: 0,
  downgrade: 0,
  "ai-renewal": 1,
  "ai-signing": 1,
});

export const markNotificationsRead = (notifications) => {
  let changed = false;
  const nextNotifications = (notifications || []).map((notification) => {
    if (notification.read) return notification;
    changed = true;
    return { ...notification, read: true };
  });
  return { changed, notifications: nextNotifications };
};

export const sortUnreadNotifications = (notifications) =>
  (notifications || [])
    .filter((notification) => !notification.read)
    .slice()
    .sort((left, right) => {
      const leftPriority = NOTIFICATION_PRIORITY_BY_TYPE[left.type] ?? 2;
      const rightPriority = NOTIFICATION_PRIORITY_BY_TYPE[right.type] ?? 2;
      return (
        leftPriority - rightPriority ||
        (Number(right.day) || 0) - (Number(left.day) || 0) ||
        String(right.createdAt || "").localeCompare(String(left.createdAt || ""))
      );
    });

export const normalizeNotifications = (notifications, fallbackDay) =>
  (notifications || []).map((notification) => ({
    id: notification.id,
    type: notification.type,
    title: notification.title,
    message: notification.message,
    day: Number(notification.day) || fallbackDay,
    createdAt: notification.createdAt || null,
    playerId: notification.playerId || null,
    read: Boolean(notification.read),
  }));

export const createDevelopmentNotification = (event, day) => {
  const isUpgrade = event.type === "upgrade";
  return {
    id: `notification-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type: event.type,
    title: isUpgrade ? "Рост рейтинга" : "Снижение рейтинга",
    message: `${event.playerName}: OVR ${event.oldOvr} → ${event.newOvr}`,
    day,
    createdAt: new Date().toISOString(),
    playerId: event.playerId,
    read: false,
  };
};
