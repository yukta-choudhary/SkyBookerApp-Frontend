import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { RegisterRequest, Role } from '../../../../core/models/index';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css'
})
export class RegisterComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  // Backend-aligned fields
  fullName = '';
  email = '';
  phone = '';
  password = '';
  confirmPassword = '';
  role: Role = 'PASSENGER';
  passportNumber = '';
  nationality = '';
  acceptTerms = false;

  showPassword = false;
  showConfirmPassword = false;

  loading = signal(false);
  error = signal('');
  success = signal('');

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPassword(): void {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  get isFormInvalid(): boolean {
    return (
      !this.fullName.trim() ||
      !this.email.trim() ||
      !this.phone.trim() ||
      !this.password.trim() ||
      !this.confirmPassword.trim() ||
      !this.acceptTerms
    );
  }

  register(): void {
    this.error.set('');
    this.success.set('');

    if (this.isFormInvalid) {
      this.error.set('Please fill in all required fields and accept the terms.');
      return;
    }

    if (this.password !== this.confirmPassword) {
      this.error.set('Passwords do not match.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.email.trim())) {
      this.error.set('Please enter a valid email address.');
      return;
    }

    if (this.password.length < 8) {
      this.error.set('Password must be at least 8 characters long.');
      return;
    }

    this.loading.set(true);

    const payload: RegisterRequest = {
      fullName: this.fullName.trim(),
      email: this.email.trim(),
      password: this.password,
      phone: this.phone.trim(),
      role: this.role,
      passportNumber: this.passportNumber.trim() || undefined,
      nationality: this.nationality.trim() || undefined
    };

    this.authService.register(payload).subscribe({
      next: (res) => {
        this.loading.set(false);
        this.success.set('Account created! Redirecting...');
        setTimeout(() => {
          if (res.role === 'PASSENGER') this.router.navigateByUrl('/passenger/dashboard');
          else if (res.role === 'AIRLINE_STAFF') this.router.navigateByUrl('/staff/dashboard');
          else this.router.navigateByUrl('/auth/login');
        }, 800);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err?.error?.message || 'Registration failed. Please try again.');
      }
    });
  }

  loginWithGoogle(): void {
    window.location.href = `${window.location.origin}/oauth2/authorization/google`;
  }
}