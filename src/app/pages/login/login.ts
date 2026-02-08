import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  Validators,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../auth/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './login.html',
  styleUrls: ['./login.css'],
})
export class Login {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  authService: AuthService = inject(AuthService);

  submitted = signal(false);
  isLoading = signal(false);
  showPassword = signal(false);
  errorMsg = signal('');

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email, this.unitecEmailValidator]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    remember: [true],
  });

  unitecEmailValidator(control: AbstractControl): ValidationErrors | null {
    if (!control.value) return null;

    const email = control.value.toLowerCase();
    const isValid = email.endsWith('@unitec.edu');

    return isValid ? null : { unitecEmail: true };
  }

  get email() {
    return this.form.get('email')!;
  }

  get password() {
    return this.form.get('password')!;
  }

  validateEmail() {
    this.email.updateValueAndValidity();
  }

  togglePassword() {
    this.showPassword.set(!this.showPassword());
  }

  onForgot(ev: Event) {
    ev.preventDefault();
    this.errorMsg.set('Redirigiendo a recuperación de contraseña...');
    setTimeout(() => this.errorMsg.set(''), 3000);
  }

  async onGoogle() {
    try {
      await this.authService.loginWithGoogle();
      await this.router.navigateByUrl('/dashboard', { replaceUrl: true });
    } catch (error) {
      this.errorMsg.set('Error al iniciar sesión con Google');
      setTimeout(() => this.errorMsg.set(''), 3000);
    }
  }

  async onSubmit() {
    this.submitted.set(true);
    this.errorMsg.set('');

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);

    try {
      await this.authService.login(this.email.value!, this.password.value!);

      await this.router.navigateByUrl('/dashboard', { replaceUrl: true });
    } catch (e: any) {
      this.errorMsg.set(e?.code ?? e?.message ?? 'Error al iniciar sesión');
    } finally {
      this.isLoading.set(false);
    }
  }
}
