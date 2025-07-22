import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { UserNavbarComponent } from '../user-navbar/user-navbar.component';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-user-layout',
  standalone: true,
  imports: [RouterOutlet, UserNavbarComponent, CommonModule],
  template: `
    <app-user-navbar></app-user-navbar>
    <router-outlet></router-outlet>
  `
})
export class UserLayoutComponent {}
