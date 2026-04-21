import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FlightService } from '../../../core/services/flight.service';
import { AirlineService } from '../../../core/services/airline.service';
import { AuthService } from '../../../core/services/auth.service';
import { Flight, Airline, Airport, FlightStatus } from '../../../core/models/index';
import { NavbarComponent } from '../../../shared/navbar/navbar.component';
import { FooterComponent } from '../../../shared/footer/footer.component';
import { forkJoin, of, EMPTY } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Component({
  selector: 'app-flight-search',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, NavbarComponent, FooterComponent],
  templateUrl: './flight-search.component.html',
  styleUrl: './flight-search.component.css'
})
export class FlightSearchComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly flightService = inject(FlightService);
  private readonly airlineService = inject(AirlineService);
  readonly authService = inject(AuthService);

  // Query params
  origin = '';
  destination = '';
  date = '';
  returnDate = '';
  passengers = 1;
  tripType = 'ONE_WAY';

  // Data
  flights = signal<Flight[]>([]);
  returnFlights = signal<Flight[]>([]);
  airlines = signal<Map<string, Airline>>(new Map());
  airports = signal<Map<string, Airport>>(new Map());

  loading = signal(true);
  error = signal('');

  // Filters
  sortBy = signal<'price' | 'departure' | 'duration'>('price');
  filterStatus = signal<FlightStatus | ''>('');
  showFilters = signal(false);

  // Round trip tab
  activeTab = signal<'outbound' | 'return'>('outbound');

  setFilterStatus(s: string): void { this.filterStatus.set(s as '' | FlightStatus); }

  filteredFlights = computed(() => {
    let list = this.tripType === 'ROUND_TRIP' && this.activeTab() === 'return'
      ? this.returnFlights()
      : this.flights();

    if (this.filterStatus()) {
      list = list.filter(f => f.status === this.filterStatus());
    }

    switch (this.sortBy()) {
      case 'price': return [...list].sort((a,b) => a.basePrice - b.basePrice);
      case 'departure': return [...list].sort((a,b) => new Date(a.departureTime).getTime() - new Date(b.departureTime).getTime());
      case 'duration': return [...list].sort((a,b) => a.durationMinutes - b.durationMinutes);
      default: return list;
    }
  });

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      this.origin = params['origin'] || '';
      this.destination = params['destination'] || '';
      this.date = params['date'] || '';
      this.returnDate = params['returnDate'] || '';
      this.passengers = parseInt(params['passengers'] || '1');
      this.tripType = params['tripType'] || 'ONE_WAY';
      this.loadFlights();
    });
  }

  private loadFlights(): void {
    this.loading.set(true);
    this.error.set('');

    if (this.tripType === 'ROUND_TRIP') {
      this.flightService.searchRoundTrip(this.origin, this.destination, this.date, this.returnDate)
        .pipe(catchError(() => {
          this.error.set('Failed to load flights. Please try again.');
          this.loading.set(false);
          return EMPTY;
        }))
        .subscribe(rt => {
          this.flights.set(rt.outboundFlights || []);
          this.returnFlights.set(rt.returnFlights || []);
          this.loading.set(false);
          this.loadAirlineData();
        });
    } else {
      this.flightService.searchFlights(this.origin, this.destination, this.date)
        .pipe(catchError(() => {
          this.error.set('Failed to load flights. Please try again.');
          this.loading.set(false);
          return EMPTY;
        }))
        .subscribe(list => {
          this.flights.set(list);
          this.loading.set(false);
          this.loadAirlineData();
        });
    }
  }

  private loadAirlineData(): void {
    this.airlineService.getActiveAirlines().pipe(catchError(() => of([]))).subscribe(airlines => {
      const map = new Map<string, Airline>();
      airlines.forEach(a => map.set(a.airlineId, a));
      this.airlines.set(map);
    });
  }

  getAirline(airlineId: string): Airline | undefined {
    return this.airlines().get(airlineId);
  }

  formatDuration(minutes: number): string {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h}h ${m > 0 ? m + 'm' : ''}`.trim();
  }

  formatTime(iso: string): string {
    return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  }

  getStatusClass(status: FlightStatus): string {
    const map: Record<string, string> = {
      ON_TIME: 'on-time', DELAYED: 'delayed', CANCELLED: 'cancelled',
      DEPARTED: 'departed', ARRIVED: 'arrived'
    };
    return map[status] || '';
  }

  selectFlight(flight: Flight): void {
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/auth/login']);
      return;
    }
    this.router.navigate(['/booking/seats', flight.flightId], {
      queryParams: {
        passengers: this.passengers,
        tripType: this.tripType,
        basePrice: flight.basePrice
      }
    });
  }
}
