import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { AirlineService } from '../../../core/services/airline.service';
import { FlightService } from '../../../core/services/flight.service';
import { BookingService } from '../../../core/services/booking.service';
import { PaymentService } from '../../../core/services/payment.service';
import { NotificationService } from '../../../core/services/notification.service';
import { Airline, Airport, Flight, UserSummaryResponse, BroadcastRequest } from '../../../core/models/index';
import { NavbarComponent } from '../../../shared/navbar/navbar.component';
import { FooterComponent } from '../../../shared/footer/footer.component';
import { catchError, of } from 'rxjs';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, NavbarComponent, FooterComponent],
  templateUrl: './admin-dashboard.component.html',
  styleUrl: './admin-dashboard.component.css'
})
export class AdminDashboardComponent implements OnInit {
  readonly authService = inject(AuthService);
  private readonly airlineService = inject(AirlineService);
  private readonly paymentService = inject(PaymentService);
  private readonly notifService = inject(NotificationService);

  user = computed(() => this.authService.currentUser());

  airlines = signal<Airline[]>([]);
  airports = signal<Airport[]>([]);
  users = signal<UserSummaryResponse[]>([]);
  totalRevenue = signal(0);

  loading = signal(true);
  activeTab = signal<string>('overview');
  setTab(tab: string): void { this.activeTab.set(tab); }

  // Broadcast
  broadcastTitle = '';
  broadcastMsg = '';
  broadcastRole: string = '';
  broadcastLoading = signal(false);
  broadcastSuccess = signal('');
  broadcastError = signal('');

  // Airline form
  showAirlineModal = signal(false);
  airlineForm = { airlineId: '', name: '', iataCode: '', icaoCode: '', country: '', contactEmail: '', contactPhone: '', logoUrl: '' };
  airlineFormLoading = signal(false);
  airlineFormError = signal('');

  ngOnInit(): void {
    this.airlineService.getAllAirlines().pipe(catchError(() => of([]))).subscribe(a => {
      this.airlines.set(a);
    });
    this.airlineService.getAllAirports().pipe(catchError(() => of([]))).subscribe(p => {
      this.airports.set(p);
    });
    this.authService.getAllUsers().pipe(catchError(() => of([]))).subscribe(u => {
      this.users.set(u);
    });
    this.paymentService.getRevenue().pipe(catchError(() => of({ totalRevenue: 0, currency: 'INR' }))).subscribe(r => {
      this.totalRevenue.set(r.totalRevenue);
      this.loading.set(false);
    });
  }

  sendBroadcast(): void {
    if (!this.broadcastTitle.trim() || !this.broadcastMsg.trim()) {
      this.broadcastError.set('Title and message are required.');
      return;
    }
    this.broadcastLoading.set(true);
    this.broadcastError.set('');
    const payload: BroadcastRequest = {
      title: this.broadcastTitle.trim(),
      message: this.broadcastMsg.trim(),
      targetRole: this.broadcastRole as any || undefined
    };
    this.notifService.broadcastNotification(payload).subscribe({
      next: (res) => {
        this.broadcastLoading.set(false);
        this.broadcastSuccess.set(`Notification sent to ${res.sent} users!`);
        this.broadcastTitle = '';
        this.broadcastMsg = '';
        this.broadcastRole = '';
        setTimeout(() => this.broadcastSuccess.set(''), 3000);
      },
      error: (err) => {
        this.broadcastLoading.set(false);
        this.broadcastError.set(err?.error?.message || 'Failed to send broadcast.');
      }
    });
  }

  saveAirline(): void {
    this.airlineFormLoading.set(true);
    this.airlineFormError.set('');
    this.airlineService.createAirline(this.airlineForm as any).subscribe({
      next: (a) => {
        this.airlines.update(list => [a, ...list]);
        this.airlineFormLoading.set(false);
        this.showAirlineModal.set(false);
        this.airlineForm = { airlineId: '', name: '', iataCode: '', icaoCode: '', country: '', contactEmail: '', contactPhone: '', logoUrl: '' };
      },
      error: (err) => {
        this.airlineFormLoading.set(false);
        this.airlineFormError.set(err?.error?.message || 'Failed to create airline.');
      }
    });
  }

  toggleAirline(airline: Airline): void {
    const action$ = airline.isActive
      ? this.airlineService.deactivateAirline(airline.airlineId)
      : this.airlineService.activateAirline(airline.airlineId);

    action$.pipe(catchError(() => of(null))).subscribe(updated => {
      if (updated) {
        this.airlines.update(list => list.map(a => a.airlineId === updated.airlineId ? updated : a));
      }
    });
  }

  get passengerCount(): number { return this.users().filter(u => u.role === 'PASSENGER').length; }
  get staffCount(): number { return this.users().filter(u => u.role === 'AIRLINE_STAFF').length; }
  get adminCount(): number { return this.users().filter(u => u.role === 'ADMIN').length; }
  get activeAirlinesCount(): number { return this.airlines().filter(a => a.isActive).length; }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  }
}
