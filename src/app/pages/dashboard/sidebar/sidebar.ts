import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../auth/services/auth.service';
import { UiService } from '../../../services/ui.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './sidebar.html',
  styleUrls: ['./sidebar.css'],
})
export class SidebarComponent {

  isOpen = false;

  
  private ui = inject(UiService);
  private router = inject(Router);
  private authService = inject(AuthService);

  constructor() {
    
    this.ui.sidebarOpen$.subscribe(open => {
      this.isOpen = open;
    });
  }

  async logout() {
    await this.authService.logout();
    this.ui.closeSidebar(); 
    window.location.reload();
  }

  closeOnMobile() {
    if (window.innerWidth < 768) {
      this.ui.closeSidebar();
    }
  }
}
