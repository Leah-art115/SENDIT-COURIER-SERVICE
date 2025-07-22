import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface Notification {
  id?: number; // ✅ make optional
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  requireAction?: boolean;
  onAction?: (result: 'yes' | 'no' | 'cancel') => void;
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private notifications = new BehaviorSubject<Notification[]>([]);
  notifications$ = this.notifications.asObservable();

  private idCounter = 0;

  private addNotification(notification: Notification) {
    const current = this.notifications.value;
    this.notifications.next([
      ...current,
      { ...notification, id: this.idCounter++ }
    ]);
  }

  private removeNotification(id: number) {
    const updated = this.notifications.value.filter(n => n.id !== id);
    this.notifications.next(updated);
  }

  success(message: string) {
    this.addNotification({ message, type: 'success' });
    this.autoRemove(this.idCounter - 1);
  }

  error(message: string) {
    this.addNotification({ message, type: 'error' });
    this.autoRemove(this.idCounter - 1);
  }

  info(message: string) {
    this.addNotification({ message, type: 'info' });
    this.autoRemove(this.idCounter - 1);
  }

  warning(message: string) {
    this.addNotification({ message, type: 'warning' });
    this.autoRemove(this.idCounter - 1);
  }

  confirm(message: string, callback: (result: 'yes' | 'no' | 'cancel') => void) {
    this.addNotification({
      message,
      type: 'warning',
      requireAction: true,
      onAction: callback
    });
  }

  confirmAction(id: number, result: 'yes' | 'no' | 'cancel') {
    const notif = this.notifications.value.find(n => n.id === id);
    if (notif?.onAction) notif.onAction(result);
    this.removeNotification(id);
  }

  dismiss(id: number) {
    this.removeNotification(id);
  }

  private autoRemove(id: number) {
    setTimeout(() => this.removeNotification(id), 4000);
  }
}
