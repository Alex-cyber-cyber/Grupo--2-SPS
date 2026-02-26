import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterModule } from '@angular/router';

import { AuthService } from '../../../auth/services/auth.service';
import { UiService } from '../../../services/ui.service';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './topbar.html',
  styleUrl: './topbar.css',
})
export class TopbarComponent {
  private ui = inject(UiService);
  authService = inject(AuthService);
  user$ = this.authService.user$;

  toggleSidebar(): void {
    this.ui.toggleSidebar();
  }
}
