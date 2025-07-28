import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import { AdminParcelService } from '../../../services/admin-parcel.service';
import { NotificationService } from '../../../shared/notification/notification.service';

@Component({
  selector: 'app-admin-create-parcel',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './admin-create-parcel.component.html',
  styleUrls: ['./admin-create-parcel.component.css'],
})
export class AdminCreateParcelComponent implements OnInit {
  form!: FormGroup;
  submittedParcel: any = null;

  constructor(
    private fb: FormBuilder,
    private parcelService: AdminParcelService,
    private notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      senderName: ['', Validators.required],
      senderEmail: ['', [Validators.required, Validators.email]],
      receiverName: ['', Validators.required],
      receiverEmail: ['', [Validators.required, Validators.email]],
      from: ['', Validators.required],
      to: ['', Validators.required],
      type: ['', Validators.required],
      weight: [1, [Validators.required, Validators.min(0.001)]],
      mode: ['', Validators.required],
      description: [''],
    });
  }

  onSubmit(): void {
    if (this.form.invalid) return;

    const dto = {
      ...this.form.value,
      type: this.form.value.type.toUpperCase(), // e.g., "ENVELOPE"
      mode: this.form.value.mode.toUpperCase(), // e.g., "STANDARD"
    };

    this.parcelService.createParcel(dto).subscribe({
      next: (parcel) => {
        this.submittedParcel = parcel;
        this.notificationService.success(
          `Parcel Created! Tracking ID: ${parcel.trackingId} | Price: KSH ${parcel.price}`
        );
        this.form.reset();
      },
      error: (err) => {
        console.error('Parcel creation failed:', err);
        this.notificationService.error('Error creating parcel.');
      },
    });
  }
}