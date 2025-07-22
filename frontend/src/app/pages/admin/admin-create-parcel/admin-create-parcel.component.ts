import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormControl } from '@angular/forms';

interface ParcelFormData {
  senderName: string;
  senderEmail: string;
  receiverName: string;
  receiverEmail: string;
  from: string;
  to: string;
  currentLocation: string;
  type: string;
  weight: number;
  mode: string;
  description: string;
  status: string;
  trackingId: string;
  price: number;
}

@Component({
  selector: 'app-admin-create-parcel',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './admin-create-parcel.component.html',
  styleUrls: ['./admin-create-parcel.component.css']
})
export class AdminCreateParcelComponent implements OnInit {
  form!: FormGroup<{
    senderName: FormControl<string>;
    senderEmail: FormControl<string>;
    receiverName: FormControl<string>;
    receiverEmail: FormControl<string>;
    from: FormControl<string>;
    to: FormControl<string>;
    currentLocation: FormControl<string>;
    type: FormControl<string>;
    weight: FormControl<number>;
    mode: FormControl<string>;
    description: FormControl<string>;
    status: FormControl<string>;
    trackingId: FormControl<string>;
    price: FormControl<number>;
  }>;

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
  this.form = this.fb.group({
    senderName: this.fb.nonNullable.control('', Validators.required),
    senderEmail: this.fb.nonNullable.control('', [Validators.required, Validators.email]),
    receiverName: this.fb.nonNullable.control('', Validators.required),
    receiverEmail: this.fb.nonNullable.control('', [Validators.required, Validators.email]),
    from: this.fb.nonNullable.control('', Validators.required),
    to: this.fb.nonNullable.control('', Validators.required),
    currentLocation: this.fb.nonNullable.control('', Validators.required),
    type: this.fb.nonNullable.control('', Validators.required),
    weight: this.fb.nonNullable.control(1, [Validators.required, Validators.min(0.001)]),
    mode: this.fb.nonNullable.control('', Validators.required),
    description: this.fb.nonNullable.control(''),
    status: this.fb.nonNullable.control('In Transit', Validators.required),
    trackingId: this.fb.nonNullable.control(''),
    price: this.fb.nonNullable.control({ value: 0, disabled: true })
  });
}


  generateTrackingId() {
    const id = 'PKG-' + Math.floor(100000 + Math.random() * 900000);
    this.form.patchValue({ trackingId: id });
  }

  calculatePrice(): number {
    const weight = this.form.get('weight')?.value || 0;
    const from = this.form.get('from')?.value || '';
    const to = this.form.get('to')?.value || '';
    const distanceFactor = Math.abs(from.length - to.length) || 1;
    return 200 + (weight * 50) + (distanceFactor * 100);
  }

  onSubmit() {
    if (this.form.valid) {
      console.log('Parcel created:', this.form.getRawValue() as ParcelFormData);
      alert('Parcel created successfully!');
      this.form.reset();
      this.generateTrackingId();
    }
  }
}
