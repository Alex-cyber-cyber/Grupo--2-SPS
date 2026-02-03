import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './register.html',
  styleUrls: ['./register.css'],
})
export class Register {
  private fb = inject(FormBuilder);

  submitted = false;
  isLoading = false;
  showPassword = false;
  showConfirm = false;
  errorMsg = '';

  form = this.fb.group(
    {
      names: ['', [Validators.required, Validators.minLength(2)]],
      lastNames: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email, this.unitecEmailValidator]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required, Validators.minLength(6)]],
      terms: [false, [Validators.requiredTrue]],
    },
    { validators: [this.passwordMatchValidator] }
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
      } else if (this.form.errors?.['passwordMismatch']) {
        this.errorMsg = 'Las contraseñas no coinciden';
      } else if (this.form.get('terms')?.invalid) {
        this.errorMsg = 'Debes aceptar los términos';
      }

      return;
    }

    this.isLoading = true;

    try {
      await new Promise(r => setTimeout(r, 1500));
      this.errorMsg = 'Cuenta creada exitosamente';
      setTimeout(() => (this.errorMsg = ''), 2500);
    } catch (e: any) {
      this.errorMsg = e?.message ?? 'Error al registrar';
    } finally {
      this.isLoading = false;
    }
  }
}
