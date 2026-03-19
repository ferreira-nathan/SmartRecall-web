'use client';

export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) {
    console.warn('Ce navigateur ne supporte pas les notifications.');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission === 'denied') {
    return false;
  }

  const permission = await Notification.requestPermission();
  return permission === 'granted';
}

export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!('Notification' in window)) return 'unsupported';
  return Notification.permission;
}

export function sendNotification(title: string, body: string, icon?: string): void {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;

  try {
    new Notification(title, {
      body,
      icon: icon || '🧠',
      badge: '🧠',
      tag: 'smartrecall-reminder',
    });
  } catch {
    // Fallback for environments that don't support Notification constructor
  }
}

let reminderInterval: ReturnType<typeof setInterval> | null = null;

export function scheduleReminder(reminderTime: string, dueCount: number): void {
  // Clear existing reminder
  if (reminderInterval) {
    clearInterval(reminderInterval);
    reminderInterval = null;
  }

  if (!reminderTime || dueCount === 0) return;

  const [hours, minutes] = reminderTime.split(':').map(Number);

  // Check every minute if it's time
  reminderInterval = setInterval(() => {
    const now = new Date();
    if (now.getHours() === hours && now.getMinutes() === minutes) {
      sendNotification(
        '🧠 SmartRecall — C\'est l\'heure de réviser !',
        `Tu as ${dueCount} carte${dueCount > 1 ? 's' : ''} à réviser. Ne perds pas ta flamme ! 🔥`,
      );
    }
  }, 60000); // Check every minute
}

export function clearReminder(): void {
  if (reminderInterval) {
    clearInterval(reminderInterval);
    reminderInterval = null;
  }
}
