import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { DriverNavbarComponent } from '../driver-navbar/driver-navbar.component';

@Component({
  selector: 'app-driver-layout',
  standalone: true,
  imports: [RouterOutlet, DriverNavbarComponent],
  templateUrl: './driver-layout.component.html',
  styleUrls: ['./driver-layout.component.css']
})
export class DriverLayoutComponent {}
