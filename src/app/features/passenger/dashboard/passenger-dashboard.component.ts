import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { BookingService } from '../../../core/services/booking.service';
import { Booking } from '../../../core/models/index';
import { NavbarComponent } from '../../../shared/navbar/navbar.component';
import { FooterComponent } from '../../../shared/footer/footer.component';
import { catchError, of } from 'rxjs';

@Component({
  selector: 'app-passenger-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, NavbarComponent, FooterComponent],
  templateUrl: './passenger-dashboard.component.html',
  styleUrl: './passenger-dashboard.component.css'
})
export class PassengerDashboardComponent implements OnInit {
  readonly authService = inject(AuthService);
  private readonly bookingService = inject(BookingService);

  user = computed(() => this.authService.currentUser());

  upcomingBookings = signal<Booking[]>([]);
  allBookings = signal<Booking[]>([]);

  loading = signal(true);
  greeting = '';

  ngOnInit(): void {
    this.setGreeting();
    const userId = this.authService.getUserId();
    if (!userId) return;

    this.bookingService.getUpcomingBookings(userId).pipe(catchError(() => of([]))).subscribe(b => {
      this.upcomingBookings.set(b);
    });

    this.bookingService.getBookingsByUser(userId).pipe(catchError(() => of([]))).subscribe(b => {
      this.allBookings.set(b);
      this.loading.set(false);
    });

  }

  private setGreeting(): void {
    const hour = new Date().getHours();
    if (hour < 12) this.greeting = 'Good morning';
    else if (hour < 17) this.greeting = 'Good afternoon';
    else this.greeting = 'Good evening';
  }

  getStatusClass(status: string): string {
    const map: Record<string, string> = {
      CONFIRMED: 'status-confirmed', PENDING: 'status-pending',
      CANCELLED: 'status-cancelled', COMPLETED: 'status-completed'
    };
    return map[status] || '';
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  formatTime(iso: string): string {
    return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });
  }

}
