import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-driver-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './driver-navbar.component.html',
  styleUrls: ['./driver-navbar.component.css']
})
export class DriverNavbarComponent {
  logout() {
    localStorage.clear();
    location.reload();
  }
}
