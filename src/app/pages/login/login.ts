import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';

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

  submitted = false;
  isLoading = false;
  showPassword = false;
  errorMsg = '';

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
    this.showPassword = !this.showPassword;
  }

  onForgot(ev: Event) {
    ev.preventDefault();
    this.errorMsg = 'Redirigiendo a recuperación de contraseña...';
    setTimeout(() => (this.errorMsg = ''), 3000);
  }

  onGoogle() {
    this.errorMsg = 'Conectando con Google...';
    setTimeout(() => (this.errorMsg = ''), 3000);
  }

  async onSubmit() {
    this.submitted = true;
    this.errorMsg = '';

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      
      if (this.email.errors?.['unitecEmail']) {
        this.errorMsg = 'Solo se permiten correos institucionales @unitec.edu';
      }
      
      return;
    }

    this.isLoading = true;
    
    try {
      await new Promise(r => setTimeout(r, 1000));
      this.router.navigate(['/dashboard']);
    } catch (e: any) {
      this.errorMsg = e?.message ?? 'Error al iniciar sesión';
    } finally {
      this.isLoading = false;
    }
 }
}