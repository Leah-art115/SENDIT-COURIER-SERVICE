import { Component, OnInit } from '@angular/core';
import { NotificationService, Notification } from './notification.service';
import { NotificationComponent } from './notification.component';
import { CommonModule } from '@angular/common'; // ✅ Add this

@Component({
  selector: 'app-notification-host',
  standalone: true,
  imports: [CommonModule, NotificationComponent], // ✅ Add both
  templateUrl: './notification-host.component.html',
  styleUrls: ['./notification-host.component.css']
})
export class NotificationHostComponent implements OnInit {
  notifications: Notification[] = [];

  constructor(private notificationService: NotificationService) {}

  ngOnInit() {
    this.notificationService.notifications$.subscribe(list => {
      this.notifications = list;
    });
  }

  confirm(id: number, result: 'yes' | 'no' | 'cancel') {
    this.notificationService.confirmAction(id, result);
  }

  dismiss(id: number) {
    this.notificationService.dismiss(id);
  }
}
