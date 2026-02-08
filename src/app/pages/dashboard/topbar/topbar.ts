import { Component, inject } from '@angular/core';
import { AuthService } from '../../../auth/services/auth.service';
import { AsyncPipe } from '@angular/common';

@Component({
  selector: 'app-topbar',
  standalone: true,
  templateUrl: './topbar.html',
  styleUrls: ['./topbar.css'],
  imports: [AsyncPipe],
})
export class TopbarComponent {
  authService = inject(AuthService);
}
