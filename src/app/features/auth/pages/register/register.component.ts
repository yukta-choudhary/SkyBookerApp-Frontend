import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';

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

  firstName = '';
  lastName = '';
  email = '';
  phone = '';
  password = '';
  confirmPassword = '';
  acceptTerms = false;

  showPassword = false;
  showConfirmPassword = false;

  loading = signal(false);
  error = signal('');
  success = signal('');

  isFormInvalid = computed(() => {
    return (
      !this.firstName.trim() ||
      !this.lastName.trim() ||
      !this.email.trim() ||
      !this.phone.trim() ||
      !this.password.trim() ||
      !this.confirmPassword.trim() ||
      !this.acceptTerms
    );
  });

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPassword(): void {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  register(): void {
    this.error.set('');
    this.success.set('');

    if (this.isFormInvalid()) {
      this.error.set('Please fill all fields and accept the terms.');
      return;
    }

    if (this.password !== this.confirmPassword) {
      this.error.set('Password and confirm password do not match.');
      return;
    }

    if (this.password.length < 6) {
      this.error.set('Password must be at least 6 characters long.');
      return;
    }

    this.loading.set(true);

    this.authService.register({
      firstName: this.firstName.trim(),
      lastName: this.lastName.trim(),
      email: this.email.trim(),
      phone: this.phone.trim(),
      password: this.password,
      confirmPassword: this.confirmPassword
    }).subscribe({
      next: () => {
        this.loading.set(false);
        this.success.set('Account created successfully. Redirecting to login...');

        setTimeout(() => {
          this.router.navigateByUrl('/login');
        }, 900);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(
          err?.error?.message || 'Unable to create account right now. Please try again.'
        );
      }
    });
  }
}