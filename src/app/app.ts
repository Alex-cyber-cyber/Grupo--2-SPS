import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Auth } from '@angular/fire/auth';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements OnInit {
  private auth = inject(Auth);

  protected readonly title = signal('proyecto_vanguardia');
  protected readonly isAuthReady = signal(false);

  async ngOnInit() {
    await this.auth.authStateReady();
    this.isAuthReady.set(true);
  }
}
