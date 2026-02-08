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
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './register.html',
  styleUrls: ['./register.css'],
})
export class Register {
  private fb = inject(FormBuilder);
  private authService: AuthService = inject(AuthService);
  private router = inject(Router);
  submitted = false;
  isLoading = false;
  showPassword = false;
  showConfirm = false;
  errorMsg = signal('');

  form = this.fb.group(
    {
      names: ['', [Validators.required, Validators.minLength(2)]],
      lastNames: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email, this.unitecEmailValidator]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required, Validators.minLength(6)]],
      terms: [false, [Validators.requiredTrue]],
    },
    { validators: [this.passwordMatchValidator] },
  );

  unitecEmailValidator(control: AbstractControl): ValidationErrors | null {
    if (!control.value) return null;
    const email = String(control.value).toLowerCase().trim();
    return email.endsWith('@unitec.edu') ? null : { unitecEmail: true };
  }

  passwordMatchValidator(group: AbstractControl): ValidationErrors | null {
    const password = group.get('password')?.value;
    const confirm = group.get('confirmPassword')?.value;
    if (!password || !confirm) return null;
    return password === confirm ? null : { passwordMismatch: true };
  }

  get names() {
    return this.form.get('names')!;
  }

  get lastNames() {
    return this.form.get('lastNames')!;
  }

  get email() {
    return this.form.get('email')!;
  }

  get password() {
    return this.form.get('password')!;
  }

  get confirmPassword() {
    return this.form.get('confirmPassword')!;
  }

  validateEmail() {
    this.email.updateValueAndValidity();
  }

  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  toggleConfirm() {
    this.showConfirm = !this.showConfirm;
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
    this.submitted = true;
    this.errorMsg.set('');

    if (this.form.invalid) {
      this.form.markAllAsTouched();

      if (this.email.errors?.['unitecEmail']) {
        this.errorMsg.set('Solo se permiten correos institucionales @unitec.edu');
      } else if (this.form.errors?.['passwordMismatch']) {
        this.errorMsg.set('Las contraseñas no coinciden');
      } else if (this.form.get('terms')?.invalid) {
        this.errorMsg.set('Debes aceptar los términos');
      }

      return;
    }

    this.isLoading = true;

    try {
      const response = await this.authService.registerWithEmail({
        email: this.email.value!,
        password: this.password.value!,
        firstName: this.names.value!,
        lastName: this.lastNames.value!,
      });

      this.isLoading = false;

      if (response.user) {
        console.log('Registered user:', response.user);
        this.errorMsg.set('Registro exitoso');
        this.router.navigate(['/dashboard'], { replaceUrl: true });
      }
    } catch (e: any) {
      this.errorMsg.set(e?.message ?? 'Error al registrar');
    } finally {
      this.isLoading = false;
    }
  }
}
