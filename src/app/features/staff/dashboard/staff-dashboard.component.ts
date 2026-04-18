import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { FlightService } from '../../../core/services/flight.service';
import { BookingService } from '../../../core/services/booking.service';
import { AirlineService } from '../../../core/services/airline.service';
import { Flight, Booking, Airline, FlightStatus } from '../../../core/models/index';
import { NavbarComponent } from '../../../shared/navbar/navbar.component';
import { FooterComponent } from '../../../shared/footer/footer.component';
import { catchError, of } from 'rxjs';

@Component({
  selector: 'app-staff-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, NavbarComponent, FooterComponent],
  templateUrl: './staff-dashboard.component.html',
  styleUrl: './staff-dashboard.component.css'
})
export class StaffDashboardComponent implements OnInit {
  readonly authService = inject(AuthService);
  private readonly flightService = inject(FlightService);
  private readonly bookingService = inject(BookingService);
  private readonly airlineService = inject(AirlineService);

  user = computed(() => this.authService.currentUser());

  flights = signal<Flight[]>([]);
  selectedFlight = signal<Flight | null>(null);
  flightBookings = signal<Booking[]>([]);
  airlines = signal<Airline[]>([]);

  loading = signal(true);
  bookingsLoading = signal(false);
  updateStatusVal = signal<FlightStatus>('ON_TIME');
  updateStatusValStr = 'ON_TIME'; // for ngModel binding
  selectedAirlineId = '';       // for ngModel binding

  showStatusModal = signal(false);
  statusUpdateSuccess = signal('');
  statusUpdateError = signal('');

  ngOnInit(): void {
    this.airlineService.getAllAirlines().pipe(catchError(() => of([]))).subscribe(a => {
      this.airlines.set(a);
    });

    // For demo: load all airlines' flights
    // In real app: staff's airlineId from profile
    this.loading.set(false);
  }

  loadFlightsByAirline(airlineId: string): void {
    this.loading.set(true);
    this.flightService.getFlightsByAirline(airlineId).pipe(catchError(() => of([]))).subscribe(f => {
      this.flights.set(f);
      this.loading.set(false);
    });
  }

  selectFlight(flight: Flight): void {
    this.selectedFlight.set(flight);
    this.loadBookings(flight.flightId);
  }

  loadBookings(flightId: string): void {
    this.bookingsLoading.set(true);
    this.bookingService.getBookingsByFlight(flightId).pipe(catchError(() => of([]))).subscribe(b => {
      this.flightBookings.set(b);
      this.bookingsLoading.set(false);
    });
  }

  openStatusModal(flight: Flight): void {
    this.selectedFlight.set(flight);
    this.updateStatusValStr = flight.status as FlightStatus;
    this.updateStatusVal.set(flight.status as FlightStatus);
    this.statusUpdateSuccess.set('');
    this.statusUpdateError.set('');
    this.showStatusModal.set(true);
  }

  updateFlightStatus(): void {
    const flight = this.selectedFlight();
    if (!flight) return;
    this.flightService.updateFlightStatus(flight.flightId, this.updateStatusVal()).subscribe({
      next: (updated) => {
        const list = this.flights().map(f => f.flightId === updated.flightId ? updated : f);
        this.flights.set(list);
        this.statusUpdateSuccess.set('Status updated successfully!');
        setTimeout(() => { this.showStatusModal.set(false); this.statusUpdateSuccess.set(''); }, 1200);
      },
      error: (err) => {
        this.statusUpdateError.set(err?.error?.message || 'Failed to update status.');
      }
    });
  }

  closeModal(): void { this.showStatusModal.set(false); }

  formatTime(iso: string): string {
    return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  getStatusClass(status: string): string {
    const m: Record<string, string> = { ON_TIME: 'on-time', DELAYED: 'delayed', CANCELLED: 'cancelled', DEPARTED: 'departed', ARRIVED: 'arrived' };
    return m[status] || '';
  }

  getBookingStatusClass(status: string): string {
    const m: Record<string, string> = { CONFIRMED: 'status-confirmed', PENDING: 'status-pending', CANCELLED: 'status-cancelled', COMPLETED: 'status-completed' };
    return m[status] || '';
  }

  statuses: FlightStatus[] = ['ON_TIME', 'DELAYED', 'CANCELLED', 'DEPARTED', 'ARRIVED'];
}
