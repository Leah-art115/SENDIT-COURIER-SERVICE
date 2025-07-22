import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common'; // ✅ Add this

@Component({
  selector: 'app-notification',
  standalone: true,
  imports: [CommonModule], // ✅ Add this
  templateUrl: './notification.component.html',
  styleUrls: ['./notification.component.css']
})
export class NotificationComponent {
  @Input() show: boolean = true;
  @Input() message: string = '';
  @Input() type: 'success' | 'error' | 'info' | 'warning' = 'info';
  @Input() requireAction: boolean = false;

  @Output() actionConfirmed = new EventEmitter<'yes' | 'no' | 'cancel'>();
  @Output() dismissed = new EventEmitter<void>();

  confirm(response: 'yes' | 'no' | 'cancel') {
    this.actionConfirmed.emit(response);
  }

  dismiss() {
    this.dismissed.emit();
  }
}
