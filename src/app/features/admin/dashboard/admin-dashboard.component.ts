import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { AirlineService } from '../../../core/services/airline.service';
import { FlightService } from '../../../core/services/flight.service';
import { BookingService } from '../../../core/services/booking.service';
import { PaymentService } from '../../../core/services/payment.service';
import { NotificationService } from '../../../core/services/notification.service';
import { Airline, Airport, AirlineCreateRequest, AirportCreateRequest, UserSummaryResponse, BroadcastRequest } from '../../../core/models/index';
import { NavbarComponent } from '../../../shared/navbar/navbar.component';
import { FooterComponent } from '../../../shared/footer/footer.component';
import { catchError, of } from 'rxjs';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, NavbarComponent, FooterComponent],
  templateUrl: './admin-dashboard.component.html',
  styleUrl: './admin-dashboard.component.css'
})
export class AdminDashboardComponent implements OnInit {
  readonly authService = inject(AuthService);
  private readonly airlineService = inject(AirlineService);
  private readonly paymentService = inject(PaymentService);
  private readonly notifService = inject(NotificationService);
  private readonly router = inject(Router);

  user = computed(() => this.authService.currentUser());

  airlines = signal<Airline[]>([]);
  airports = signal<Airport[]>([]);
  users = signal<UserSummaryResponse[]>([]);
  totalRevenue = signal(0);
  monthlyRevenue = signal<number[]>(Array(12).fill(0));

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
  airlineForm: AirlineCreateRequest = { name: '', iataCode: '', icaoCode: '', country: '', contactEmail: '', contactPhone: '', logoUrl: '' };
  editingAirlineId = signal<string | null>(null);
  airlineFormLoading = signal(false);
  airlineFormError = signal('');

  // Airport form
  showAirportModal = signal(false);
  airportForm: AirportCreateRequest = { name: '', iataCode: '', icaoCode: '', city: '', country: '', latitude: 0, longitude: 0, timezone: '' };
  editingAirportId = signal<string | null>(null);
  airportFormLoading = signal(false);
  airportFormError = signal('');

  ngOnInit(): void {
    this.syncTabFromUrl();
    this.airlineService.getAllAirlines().pipe(catchError(() => of([]))).subscribe(a => {
      this.airlines.set(a);
    });
    this.airlineService.getAllAirports().pipe(catchError(() => of([]))).subscribe(p => {
      this.airports.set(p);
    });
    this.authService.getAllUsers().pipe(catchError(() => of([]))).subscribe(u => {
      this.users.set(u);
    });
    this.paymentService.getRevenue().pipe(catchError(() => of({ totalRevenue: 0 }))).subscribe((r: any) => {
      this.totalRevenue.set(r.totalRevenue ?? 0);
      this.loading.set(false);
    });
    this.paymentService.getMonthlyRevenue(2026).pipe(catchError(() => of({}))).subscribe((revenue: Record<string, number>) => {
      this.monthlyRevenue.set(Array.from({ length: 12 }, (_, i) => revenue[String(i + 1)] ?? 0));
    });
  }

  syncTabFromUrl(): void {
    const segment = this.router.url.split('?')[0].split('/').pop();
    if (segment && ['dashboard', 'overview', 'airlines', 'airports', 'users', 'broadcast'].includes(segment)) {
      this.activeTab.set(segment === 'dashboard' ? 'overview' : segment);
    }
  }

  openAddAirlineModal(): void {
    this.editingAirlineId.set(null);
    this.airlineFormError.set('');
    this.airlineForm = { name: '', iataCode: '', icaoCode: '', country: '', contactEmail: '', contactPhone: '', logoUrl: '' };
    this.showAirlineModal.set(true);
  }

  openEditAirlineModal(airline: Airline): void {
    this.editingAirlineId.set(airline.airlineId);
    this.airlineFormError.set('');
    this.airlineForm = {
      name: airline.name,
      iataCode: airline.iataCode,
      icaoCode: airline.icaoCode,
      country: airline.country,
      contactEmail: airline.contactEmail,
      contactPhone: airline.contactPhone,
      logoUrl: airline.logoUrl
    };
    this.showAirlineModal.set(true);
  }

  closeAirlineModal(): void {
    this.showAirlineModal.set(false);
    this.editingAirlineId.set(null);
    this.airlineFormError.set('');
    this.airlineForm = { name: '', iataCode: '', icaoCode: '', country: '', contactEmail: '', contactPhone: '', logoUrl: '' };
  }

  openAddAirportModal(): void {
    this.editingAirportId.set(null);
    this.airportFormError.set('');
    this.airportForm = { name: '', iataCode: '', icaoCode: '', city: '', country: '', latitude: 0, longitude: 0, timezone: '' };
    this.showAirportModal.set(true);
  }

  openEditAirportModal(airport: Airport): void {
    this.editingAirportId.set(airport.airportId);
    this.airportFormError.set('');
    this.airportForm = {
      name: airport.name,
      iataCode: airport.iataCode,
      icaoCode: airport.icaoCode,
      city: airport.city,
      country: airport.country,
      latitude: airport.latitude,
      longitude: airport.longitude,
      timezone: airport.timezone
    };
    this.showAirportModal.set(true);
  }

  closeAirportModal(): void {
    this.showAirportModal.set(false);
    this.editingAirportId.set(null);
    this.airportFormError.set('');
    this.airportForm = { name: '', iataCode: '', icaoCode: '', city: '', country: '', latitude: 0, longitude: 0, timezone: '' };
  }

  sendBroadcast(): void {
    if (!this.broadcastTitle.trim() || !this.broadcastMsg.trim()) {
      this.broadcastError.set('Title and message are required.');
      return;
    }
    this.broadcastLoading.set(true);
    this.broadcastError.set('');

    // Determine recipient IDs based on selected role
    const usersList = this.users();
    let recipients: string[];
    if (this.broadcastRole && this.broadcastRole !== 'ALL') {
      recipients = usersList.filter(u => u.role === this.broadcastRole).map(u => u.userId);
    } else {
      recipients = usersList.map(u => u.userId);
    }

    if (recipients.length === 0) {
      this.broadcastLoading.set(false);
      this.broadcastError.set('No users found for the selected role.');
      return;
    }

    const payload: BroadcastRequest = {
      title: this.broadcastTitle.trim(),
      message: this.broadcastMsg.trim(),
      recipientIds: recipients,
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
    const editingId = this.editingAirlineId();
    const request$ = editingId
      ? this.airlineService.updateAirline(editingId, this.airlineForm)
      : this.airlineService.createAirline(this.airlineForm);

    request$.subscribe({
      next: (a) => {
        this.airlines.update(list => editingId
          ? list.map(airline => airline.airlineId === a.airlineId ? a : airline)
          : [a, ...list]
        );
        this.airlineFormLoading.set(false);
        this.closeAirlineModal();
      },
      error: (err) => {
        this.airlineFormLoading.set(false);
        this.airlineFormError.set(err?.error?.message || `Failed to ${editingId ? 'update' : 'create'} airline.`);
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
  get maxMonthlyRevenue(): number { return Math.max(...this.monthlyRevenue(), 1); }

  readonly monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  saveAirport(): void {
    this.airportFormLoading.set(true);
    this.airportFormError.set('');
    const editingId = this.editingAirportId();
    const request$ = editingId
      ? this.airlineService.updateAirport(editingId, this.airportForm)
      : this.airlineService.createAirport(this.airportForm);

    request$.subscribe({
      next: (a) => {
        this.airports.update(list => editingId
          ? list.map(airport => airport.airportId === a.airportId ? a : airport)
          : [a, ...list]
        );
        this.airportFormLoading.set(false);
        this.closeAirportModal();
      },
      error: (err) => {
        this.airportFormLoading.set(false);
        this.airportFormError.set(err?.error?.message || `Failed to ${editingId ? 'update' : 'create'} airport.`);
      }
    });
  }

  deleteAirport(airport: Airport): void {
    const ok = window.confirm(`Delete airport ${airport.name} (${airport.iataCode})?`);
    if (!ok) return;

    this.airlineService.deleteAirport(airport.airportId).subscribe({
      next: () => {
        this.airports.update(list => list.filter(a => a.airportId !== airport.airportId));
      },
      error: () => {
        this.airportFormError.set('Failed to delete airport.');
      }
    });
  }
}
