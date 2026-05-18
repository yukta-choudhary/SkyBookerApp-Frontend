import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { FlightService } from '../../../core/services/flight.service';
import { BookingService } from '../../../core/services/booking.service';
import { AirlineService } from '../../../core/services/airline.service';
import { SeatService } from '../../../core/services/seat.service';
import { Flight, Booking, Airline, Airport, FlightCreateRequest, FlightStatus, Seat, SeatClass, SeatStatus, SeatItem } from '../../../core/models/index';
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
  private readonly seatService = inject(SeatService);
  private readonly route = inject(ActivatedRoute);

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
  statusToast = signal('');
  private statusToastTimer: ReturnType<typeof setTimeout> | null = null;

  // Add/Edit Flight form
  showAddFlightModal = signal(false);
  airports = signal<Airport[]>([]);
  editingFlightId = signal<string | null>(null);
  flightForm: FlightCreateRequest = {
    flightNumber: '', airlineId: '', originAirportCode: '', destinationAirportCode: '',
    departureTime: '', arrivalTime: '', durationMinutes: 0, totalSeats: 180,
    availableSeats: 180, basePrice: 0
  };
  addFlightLoading = signal(false);
  addFlightError = signal('');

  seatConfigFlightId = signal('');
  isSeatConfigRoute = signal(false);
  seatConfigFlight = signal<Flight | null>(null);
  seatMap = signal<Seat[]>([]);
  seatConfigLoading = signal(false);
  seatConfigSaving = signal(false);
  seatConfigError = signal('');
  seatConfigSuccess = signal('');
  seatClassFilter = signal<SeatClass | 'ALL'>('ALL');
  editingSeatClass = signal<SeatClass | null>(null);
  seatClasses: SeatClass[] = ['FIRST', 'BUSINESS', 'ECONOMY'];
  seatStatuses: SeatStatus[] = ['AVAILABLE', 'HELD', 'CONFIRMED', 'BLOCKED'];
  seatConfigForm = {
    startRow: 1,
    rows: 30,
    columns: 'A,B,C,D,E,F',
    seatClass: 'ECONOMY' as SeatClass,
    priceMultiplier: 1,
    extraLegroomRows: '1'
  };

  ngOnInit(): void {
    this.airlineService.getAllAirlines().pipe(catchError(() => of([]))).subscribe(a => {
      this.airlines.set(a);
    });
    this.airlineService.getAllAirports().pipe(catchError(() => of([]))).subscribe(p => {
      this.airports.set(p);
    });

    this.route.paramMap.subscribe(params => {
      const flightId = params.get('flightId') || '';
      this.isSeatConfigRoute.set(this.route.snapshot.routeConfig?.path?.startsWith('seat-config') ?? false);
      this.seatConfigFlightId.set(flightId);
      if (flightId) {
        this.loadSeatConfig(flightId);
      } else {
        this.seatConfigFlight.set(null);
        this.seatMap.set([]);
        this.seatConfigError.set('');
        this.seatConfigSuccess.set('');
      }
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
        const message = `Flight ${updated.flightNumber} status updated to ${updated.status.replace('_', ' ')}.`;
        this.statusUpdateSuccess.set('Status updated successfully!');
        this.showStatusToast(message);
        setTimeout(() => { this.showStatusModal.set(false); this.statusUpdateSuccess.set(''); }, 1200);
      },
      error: (err) => {
        this.statusUpdateError.set(err?.error?.message || 'Failed to update status.');
      }
    });
  }

  closeModal(): void { this.showStatusModal.set(false); }

  private showStatusToast(message: string): void {
    if (this.statusToastTimer) {
      clearTimeout(this.statusToastTimer);
    }
    this.statusToast.set(message);
    this.statusToastTimer = setTimeout(() => {
      this.statusToast.set('');
      this.statusToastTimer = null;
    }, 3000);
  }

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

  filteredSeatMap(): Seat[] {
    const selected = this.seatClassFilter();
    return this.seatMap().filter(seat => selected === 'ALL' || seat.seatClass === selected);
  }

  seatCount(status: SeatStatus): number {
    return this.seatMap().filter(seat => seat.status === status).length;
  }

  configuredSeatDifference(): number {
    const totalSeats = this.seatConfigFlight()?.totalSeats ?? 0;
    return totalSeats ? this.seatMap().length - totalSeats : 0;
  }

  loadSeatConfig(flightId = this.seatConfigFlightId()): void {
    if (!flightId) return;
    this.seatConfigLoading.set(true);
    this.seatConfigError.set('');
    this.seatConfigSuccess.set('');
    this.flightService.getFlightById(flightId).pipe(catchError(() => of(null))).subscribe(flight => {
      this.seatConfigFlight.set(flight);
    });
    this.seatService.getSeatMap(flightId).pipe(catchError(() => of([]))).subscribe(seats => {
      this.seatMap.set(this.sortSeats(seats));
      this.seatConfigLoading.set(false);
    });
  }

  generateSeatConfig(): void {
    const flightId = this.seatConfigFlightId();
    if (!flightId) return;
    const startRow = Number(this.seatConfigForm.startRow);
    const rows = Number(this.seatConfigForm.rows);
    const columns = this.seatConfigForm.columns.split(',').map(c => c.trim().toUpperCase()).filter(Boolean);
    const priceMultiplier = Number(this.seatConfigForm.priceMultiplier);

    if (!startRow || startRow < 1 || !rows || rows < 1 || columns.length === 0 || !priceMultiplier || priceMultiplier < 0.1) {
      this.seatConfigError.set('Enter valid start row, rows, columns and price multiplier.');
      return;
    }

    const extraRows = new Set(
      this.seatConfigForm.extraLegroomRows
        .split(',')
        .map(row => Number(row.trim()))
        .filter(row => row > 0)
    );
    const seats = this.buildSeatBatch(startRow, rows, columns, this.seatConfigForm.seatClass, extraRows, priceMultiplier);
    const editingClass = this.editingSeatClass();
    const seatsOutsideEditedClass = editingClass
      ? this.seatMap().filter(seat => seat.seatClass !== editingClass).length
      : this.seatMap().length;
    const flightTotalSeats = this.seatConfigFlight()?.totalSeats;
    if (flightTotalSeats && seatsOutsideEditedClass + seats.length > flightTotalSeats) {
      const remaining = flightTotalSeats - seatsOutsideEditedClass;
      this.seatConfigError.set(`This would create ${seatsOutsideEditedClass + seats.length}/${flightTotalSeats} seats. This flight has room for ${Math.max(remaining, 0)} more seats in this setup.`);
      return;
    }

    const existingSeatNumbers = new Set(
      this.seatMap()
        .filter(seat => !editingClass || seat.seatClass !== editingClass)
        .map(seat => seat.seatNumber.toUpperCase())
    );
    const duplicates = seats.filter(seat => existingSeatNumbers.has(seat.seatNumber.toUpperCase())).map(seat => seat.seatNumber);
    if (duplicates.length > 0) {
      this.seatConfigError.set(`These seats already exist for this flight: ${duplicates.slice(0, 8).join(', ')}${duplicates.length > 8 ? '...' : ''}. Change the start row before generating.`);
      return;
    }
    if (editingClass && editingClass !== this.seatConfigForm.seatClass) {
      this.seatConfigError.set('The selected seat class must match the class being edited.');
      return;
    }

    this.seatConfigSaving.set(true);
    this.seatConfigError.set('');
    this.seatConfigSuccess.set('');
    if (editingClass) {
      const keptSeats = this.seatMap()
        .filter(seat => seat.seatClass !== editingClass)
        .map(seat => this.mapSeatToSeatItem(seat));
      this.recreateSeatMap(flightId, [...keptSeats, ...seats], `${seats.length} ${editingClass} seats saved.`);
      return;
    }
    this.saveSeatBatch(flightId, seats, `${seats.length} seats added for this flight.`);
  }

  startEditSeatConfig(): void {
    const selectedClass = this.seatClassFilter();
    if (selectedClass === 'ALL') {
      this.seatConfigError.set('Select FIRST, BUSINESS or ECONOMY before editing a seat config.');
      this.seatConfigSuccess.set('');
      return;
    }

    const classSeats = this.seatMap().filter(seat => seat.seatClass === selectedClass);
    if (classSeats.length === 0) {
      this.seatConfigError.set(`No ${selectedClass} seats exist yet. Generate them first.`);
      this.seatConfigSuccess.set('');
      return;
    }

    const rowNumbers = [...new Set(classSeats.map(seat => seat.rowNumber))].sort((a, b) => a - b);
    const columns = [...new Set(classSeats.map(seat => seat.columnValue))].sort((a, b) => a.localeCompare(b));
    const extraRows = rowNumbers.filter(row => classSeats.some(seat => seat.rowNumber === row && seat.hasExtraLegroom));
    this.seatConfigForm = {
      startRow: rowNumbers[0],
      rows: rowNumbers.length,
      columns: columns.join(','),
      seatClass: selectedClass,
      priceMultiplier: classSeats[0].priceMultiplier,
      extraLegroomRows: extraRows.join(',')
    };
    this.editingSeatClass.set(selectedClass);
    this.seatConfigError.set('');
    this.seatConfigSuccess.set(`Editing ${selectedClass} seat config. Update the form, then save.`);
  }

  cancelEditSeatConfig(): void {
    this.editingSeatClass.set(null);
    this.seatConfigError.set('');
    this.seatConfigSuccess.set('');
  }

  deleteSeatsForSelectedClass(): void {
    const flightId = this.seatConfigFlightId();
    const selectedClass = this.seatClassFilter();
    if (!flightId || selectedClass === 'ALL') {
      this.seatConfigError.set('Select FIRST, BUSINESS or ECONOMY before deleting seats.');
      this.seatConfigSuccess.set('');
      return;
    }
    const count = this.seatMap().filter(seat => seat.seatClass === selectedClass).length;
    if (count === 0) return;
    if (!window.confirm(`Delete all ${count} ${selectedClass} seats for this flight?`)) return;

    this.seatConfigSaving.set(true);
    this.seatConfigError.set('');
    this.seatConfigSuccess.set('');
    const keptSeats = this.seatMap()
      .filter(seat => seat.seatClass !== selectedClass)
      .map(seat => this.mapSeatToSeatItem(seat));
    this.recreateSeatMap(flightId, keptSeats, `${selectedClass} seats deleted.`);
  }

  private saveSeatBatch(flightId: string, seats: SeatItem[], successMessage: string): void {
    this.seatService.addSeats({ flightId, seats }).subscribe({
      next: created => {
        const editingClass = this.editingSeatClass();
        this.seatMap.update(list => {
          const keptSeats = editingClass ? list.filter(seat => seat.seatClass !== editingClass) : list;
          return this.sortSeats([...keptSeats, ...created]);
        });
        this.editingSeatClass.set(null);
        this.seatConfigSaving.set(false);
        this.seatConfigSuccess.set(successMessage);
      },
      error: err => {
        this.seatConfigSaving.set(false);
        this.seatConfigError.set(err?.error?.message || 'Failed to save seats.');
      }
    });
  }

  private recreateSeatMap(flightId: string, seats: SeatItem[], successMessage: string): void {
    this.seatService.deleteSeatsForFlight(flightId).subscribe({
      next: () => {
        if (seats.length === 0) {
          this.seatMap.set([]);
          this.editingSeatClass.set(null);
          this.seatConfigSaving.set(false);
          this.seatConfigSuccess.set(successMessage);
          return;
        }
        this.seatService.addSeats({ flightId, seats }).subscribe({
          next: created => {
            this.seatMap.set(this.sortSeats(created));
            this.editingSeatClass.set(null);
            this.seatConfigSaving.set(false);
            this.seatConfigSuccess.set(successMessage);
          },
          error: err => {
            this.seatConfigSaving.set(false);
            this.seatConfigError.set(err?.error?.message || 'Seats were cleared, but failed to recreate the updated layout.');
          }
        });
      },
      error: err => {
        this.seatConfigSaving.set(false);
        this.seatConfigError.set(err?.error?.message || 'Failed to clear the old seat layout before saving.');
      }
    });
  }

  updateSeatStatus(seat: Seat, status: SeatStatus): void {
    this.seatConfigError.set('');
    this.seatConfigSuccess.set('');
    const payload = { ...seat, status };
    this.seatService.updateSeat(seat.seatId, payload).subscribe({
      next: updated => {
        this.seatMap.update(list => this.sortSeats(list.map(item => item.seatId === updated.seatId ? updated : item)));
        this.seatConfigSuccess.set(`Seat ${updated.seatNumber} marked ${updated.status.replace('_', ' ')}.`);
      },
      error: err => {
        this.seatConfigError.set(err?.error?.message || 'Failed to update seat status.');
      }
    });
  }

  deleteSeatConfig(): void {
    const flightId = this.seatConfigFlightId();
    if (!flightId || this.seatMap().length === 0) return;
    if (!window.confirm('Delete all seats configured for this flight?')) return;
    this.seatConfigSaving.set(true);
    this.seatConfigError.set('');
    this.seatConfigSuccess.set('');
    this.seatService.deleteSeatsForFlight(flightId).subscribe({
      next: () => {
        this.seatMap.set([]);
        this.editingSeatClass.set(null);
        this.seatConfigSaving.set(false);
        this.seatConfigSuccess.set('Seat configuration cleared.');
      },
      error: err => {
        this.seatConfigSaving.set(false);
        this.seatConfigError.set(err?.error?.message || 'Failed to delete seat configuration.');
      }
    });
  }

  private sortSeats(seats: Seat[]): Seat[] {
    return [...seats].sort((a, b) => a.rowNumber - b.rowNumber || a.columnValue.localeCompare(b.columnValue));
  }

  private buildSeatBatch(
    startRow: number,
    rows: number,
    columns: string[],
    seatClass: SeatClass,
    extraRows: Set<number>,
    priceMultiplier: number
  ): SeatItem[] {
    return Array.from({ length: rows }, (_, index) => startRow + index).flatMap(row =>
      columns.map((column, columnIndex) => ({
        seatNumber: `${row}${column}`,
        seatClass,
        rowNumber: row,
        columnValue: column,
        windowSeat: columnIndex === 0 || columnIndex === columns.length - 1,
        aisleSeat: columnIndex === 2 || columnIndex === 3,
        hasExtraLegroom: extraRows.has(row),
        priceMultiplier
      }))
    );
  }

  private mapSeatToSeatItem(seat: Seat): SeatItem {
    return {
      seatNumber: seat.seatNumber,
      seatClass: seat.seatClass,
      rowNumber: seat.rowNumber,
      columnValue: seat.columnValue,
      windowSeat: seat.windowSeat,
      aisleSeat: seat.aisleSeat,
      hasExtraLegroom: seat.hasExtraLegroom,
      priceMultiplier: seat.priceMultiplier
    };
  }

  statuses: FlightStatus[] = ['ON_TIME', 'DELAYED', 'CANCELLED', 'DEPARTED', 'ARRIVED'];

  openAddFlightModal(): void {
    this.editingFlightId.set(null);
    this.flightForm = {
      flightNumber: '', airlineId: this.selectedAirlineId || '', originAirportCode: '', destinationAirportCode: '',
      departureTime: '', arrivalTime: '', durationMinutes: 0, totalSeats: 180,
      availableSeats: 180, basePrice: 0
    };
    this.addFlightError.set('');
    this.showAddFlightModal.set(true);
  }

  openEditFlightModal(flight: Flight): void {
    this.editingFlightId.set(flight.flightId);
    this.flightForm = {
      flightNumber: flight.flightNumber,
      airlineId: flight.airlineId,
      originAirportCode: flight.originAirportCode,
      destinationAirportCode: flight.destinationAirportCode,
      departureTime: this.toDateTimeLocal(flight.departureTime),
      arrivalTime: this.toDateTimeLocal(flight.arrivalTime),
      durationMinutes: flight.durationMinutes,
      totalSeats: flight.totalSeats,
      availableSeats: flight.availableSeats,
      basePrice: flight.basePrice
    };
    this.addFlightError.set('');
    this.showAddFlightModal.set(true);
  }

  closeFlightModal(): void {
    this.showAddFlightModal.set(false);
    this.editingFlightId.set(null);
    this.addFlightError.set('');
  }

  onOriginAirportChange(originAirportCode: string): void {
    if (this.flightForm.destinationAirportCode === originAirportCode) {
      this.flightForm.destinationAirportCode = '';
    }
  }

  saveFlight(): void {
    if (!this.flightForm.flightNumber || !this.flightForm.airlineId || !this.flightForm.originAirportCode || !this.flightForm.destinationAirportCode || !this.flightForm.departureTime || !this.flightForm.arrivalTime) {
      this.addFlightError.set('Please fill in all required fields.'); return;
    }
    if (this.flightForm.originAirportCode === this.flightForm.destinationAirportCode) {
      this.addFlightError.set('Origin and destination airports must be different.'); return;
    }
    this.flightForm.durationMinutes = this.calculateDurationMinutes(this.flightForm.departureTime, this.flightForm.arrivalTime);
    if (this.flightForm.durationMinutes <= 0) {
      this.addFlightError.set('Arrival time must be after departure time.'); return;
    }
    if (!this.editingFlightId()) {
      this.flightForm.availableSeats = this.flightForm.totalSeats;
    }

    this.addFlightLoading.set(true);
    this.addFlightError.set('');
    const editingId = this.editingFlightId();
    const request$ = editingId
      ? this.flightService.updateFlight(editingId, this.flightForm)
      : this.flightService.addFlight(this.flightForm);

    request$.subscribe({
      next: (f) => {
        this.flights.update(list => {
          if (editingId) {
            if (this.selectedAirlineId && f.airlineId !== this.selectedAirlineId) {
              return list.filter(flight => flight.flightId !== f.flightId);
            }
            return list.map(flight => flight.flightId === f.flightId ? f : flight);
          }
          return [f, ...list];
        });
        if (this.selectedFlight()?.flightId === f.flightId) {
          this.selectedFlight.set(f);
        }
        this.addFlightLoading.set(false);
        this.closeFlightModal();
      },
      error: (err) => {
        this.addFlightLoading.set(false);
        this.addFlightError.set(err?.error?.message || `Failed to ${editingId ? 'update' : 'add'} flight.`);
      }
    });
  }

  addFlight(): void {
    this.saveFlight();
  }

  deleteFlight(flight: Flight): void {
    const ok = window.confirm(`Delete flight ${flight.flightNumber}?`);
    if (!ok) return;
    this.flightService.deleteFlight(flight.flightId).subscribe({
      next: () => {
        this.flights.update(list => list.filter(f => f.flightId !== flight.flightId));
        if (this.selectedFlight()?.flightId === flight.flightId) {
          this.selectedFlight.set(null);
          this.flightBookings.set([]);
        }
      },
      error: () => {
        this.addFlightError.set('Failed to delete flight.');
      }
    });
  }

  private calculateDurationMinutes(departure: string, arrival: string): number {
    if (!departure || !arrival) return 0;
    return Math.round((new Date(arrival).getTime() - new Date(departure).getTime()) / 60000);
  }

  private toDateTimeLocal(value: string): string {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value.slice(0, 16);
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }
}
