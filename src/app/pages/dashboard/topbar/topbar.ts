import { Component, inject } from '@angular/core';
import { AuthService } from '../../../auth/services/auth.service';
import { AsyncPipe } from '@angular/common';
import { UiService } from '../../../services/ui.service';
@Component({
  selector: 'app-topbar',
  standalone: true,
  templateUrl: './topbar.html',
  styleUrls: ['./topbar.css'],
  imports: [AsyncPipe],
})
export class TopbarComponent {

  private ui = inject(UiService);
  authService = inject(AuthService);

  toggleSidebar() {
    this.ui.toggleSidebar();
  }
}