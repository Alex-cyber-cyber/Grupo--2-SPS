import { Component, inject } from '@angular/core';
import { CommonModule, AsyncPipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../auth/services/auth.service';
import { UiService } from '../../../services/ui.service';

import { Observable } from 'rxjs';
import { User } from '@angular/fire/auth';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [
    CommonModule,
    AsyncPipe,
    RouterModule, // ✅ ESTE ES EL PASO 3
  ],
  templateUrl: './topbar.html',
  styleUrl: './topbar.css',
})
export class TopbarComponent {
  private ui = inject(UiService);
  authService = inject(AuthService);
  user$!: Observable<User | null>;

  constructor(private auth: AuthService) {
    this.user$ = this.auth.user$;
  }

  toggleSidebar() {
    this.ui.toggleSidebar();
  }
}
