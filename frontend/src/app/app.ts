import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavbarComponent } from './shared/navbar/navbar.component';
import { NotificationHostComponent } from './shared/notification/notification-host.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, NavbarComponent, NotificationHostComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected title = 'frontend';
}
