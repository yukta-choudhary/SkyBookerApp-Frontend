import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { LoginRequest } from '../../../../core/models/index';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  email = '';
  password = '';
  rememberMe = false;
  showPassword = false;

  loading = signal(false);
  error = signal('');
  success = signal('');

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  login(): void {
    this.error.set('');
    this.success.set('');

    if (!this.email.trim() || !this.password.trim()) {
      this.error.set('Please enter your email and password.');
      return;
    }

    this.loading.set(true);

    const payload: LoginRequest = {
      email: this.email.trim(),
      password: this.password
    };

    this.authService.login(payload).subscribe({
      next: (res) => {
        this.loading.set(false);
        this.success.set('Login successful. Redirecting...');
        setTimeout(() => {
          if (res.role === 'PASSENGER') this.router.navigateByUrl('/passenger/dashboard');
          else if (res.role === 'AIRLINE_STAFF') this.router.navigateByUrl('/staff/dashboard');
          else if (res.role === 'ADMIN') this.router.navigateByUrl('/admin/dashboard');
          else this.router.navigateByUrl('/');
        }, 700);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err?.error?.message || 'Invalid email or password. Please try again.');
      }
    });
  }

  loginWithGoogle(): void {
    window.location.href = `${window.location.origin}/oauth2/authorization/google`;
  }

  goToForgotPassword(): void {
    this.router.navigateByUrl('/auth/forgot-password');
  }
}