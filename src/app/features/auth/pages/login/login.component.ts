import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';

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

  isFormInvalid = computed(() => {
    return !this.email.trim() || !this.password.trim();
  });

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  login(): void {
    this.error.set('');
    this.success.set('');

    if (this.isFormInvalid()) {
      this.error.set('Please enter your email and password.');
      return;
    }

    this.loading.set(true);

    this.authService.login({
      email: this.email.trim(),
      password: this.password
    }).subscribe({
      next: (response) => {
        if (response?.token) {
          this.authService.saveToken(response.token);
        }

        this.success.set('Login successful. Redirecting...');
        this.loading.set(false);

        setTimeout(() => {
          this.router.navigateByUrl('/register');
          // Later change to dashboard/home route
          // this.router.navigateByUrl('/dashboard');
        }, 700);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(
          err?.error?.message || 'Unable to login right now. Please try again.'
        );
      }
    });
  }
}