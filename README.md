# SkyBookerApp — Frontend (Angular)

## About

SkyBooker Frontend is a modern **Angular 21** single-page application for the SkyBooker Airline Ticket Booking platform. It connects to the SkyBooker microservices backend via a unified API Gateway (`localhost:8080`) and provides role-based dashboards for Passengers, Airline Staff, and Admins — with a complete booking flow including flight search, seat selection, passenger details, Razorpay payment, and booking confirmation.

---

## Tech Stack

- **Angular 21** (standalone components, signals, `@for` / `@if` control flow)
- **TypeScript 5.9**
- **RxJS 7.8** — reactive HTTP, debounced autocomplete
- **Vanilla CSS** — custom design system (no Tailwind)
- **Google Fonts** — Inter font family
- **Google Material Symbols** — icon set
- **Razorpay Checkout.js** — client-side payment integration
- **Hash-based routing** — `withHashLocation()` for static hosting compatibility

---

## Quick Start

### Prerequisites

- **Node.js 18+** and **npm**
- All SkyBooker backend services running (see backend README)

### Install & Run

```bash
cd skybookerapp-frontend
npm install
npm start
```

App opens at **http://localhost:4200**

### Build for Production

```bash
npm run build
```

Output goes to `dist/` directory.

---

## Environment Configuration

| File | API URL | Razorpay Key |
|------|---------|--------------|
| `src/environments/environment.ts` | `http://localhost:8080` | `rzp_test_Semh94IyjyUsxQ` |
| `src/environments/environment.prod.ts` | `http://localhost:8080` | (set your live key) |

All API calls go through the **API Gateway** on port `8080`, which routes to individual microservices.

---

## User Roles & Test Credentials

The application supports three distinct roles, each with its own registration flow, dashboard, and feature set.

### Role Registration & Login

| Role | How to Register | Login Email (Example) | Password | Post-Login Redirect |
|------|----------------|-----------------------|----------|---------------------|
| **Passenger** | Register at `/auth/register` → select **Passenger** | `passenger@test.com` | `Test1234` | `/passenger/dashboard` |
| **Airline Staff** | Register at `/auth/register` → select **Airline Staff** | `staff@test.com` | `Test1234` | `/staff/dashboard` |
| **Admin** | Cannot self-register. Must be manually set in the database (see below) | `admin@test.com` | `Test1234` | `/admin/dashboard` |

### Creating an Admin Account

Admin self-registration is blocked by the backend. To set up an admin:

1. Register a normal account (e.g., as `PASSENGER`) via the registration page
2. Update the role directly in the database:
   ```sql
   USE skybooker_auth_db;
   UPDATE users SET role = 'ADMIN' WHERE email = 'admin@test.com';
   ```
3. Log in again — you'll be redirected to the **Admin Dashboard**

### Registration Form Fields

| Field | Required | Notes |
|-------|----------|-------|
| Full Name | ✅ | Min 2 characters |
| Email | ✅ | Must be unique, valid format |
| Phone | ✅ | 10–15 digits, numbers only |
| Role | ✅ | `Passenger` (default) or `Airline Staff` |
| Passport Number | ❌ | Optional, can be added later in profile |
| Nationality | ❌ | Optional, can be added later in profile |
| Password | ✅ | Min 8 characters |
| Confirm Password | ✅ | Must match password |
| Terms & Conditions | ✅ | Must accept to proceed |

### Profile Page (Post-Registration)

After registration or login, all users can visit **My Profile** (`/passenger/profile`) to update:
- Full Name
- Phone Number
- Passport Number
- Nationality
- Password (change current password)

---

## Razorpay Payment Testing

The frontend integrates with **Razorpay** for payment processing using the Razorpay Checkout.js SDK (loaded in `index.html`).

### Test Credentials

| Config | Value |
|--------|-------|
| **Razorpay Key ID** | `rzp_test_Semh94IyjyUsxQ` |
| **Mode** | Test Mode (no real charges) |

### Test Card Details

| Field | Value |
|-------|-------|
| **Card Number** | `4111 1111 1111 1111` |
| **Expiry Date** | Any future date (e.g., `12/30`) |
| **CVV** | Any 3 digits (e.g., `123`) |
| **OTP** | `1234` |

### Payment Flow (Step by Step)

1. Search and select a flight on the home page
2. Select a seat on the interactive seat map
3. Fill in passenger details and contact info
4. Click **Continue to Payment** — a booking is created with `PENDING` status
5. Click **Pay Now** — Razorpay checkout modal opens
6. Enter test card details → complete payment
7. On success → booking is confirmed, redirected to **Booking Confirmation** page with PNR code
8. Booking confirmation email is sent via the notification service (if Kafka is running)

---

## Application Pages & Features

### Public Pages

| Page | Route | Description |
|------|-------|-------------|
| **Home** | `/home` | Landing page with flight search form (origin/destination autocomplete, date pickers, trip type, passenger count) |
| **Flight Search Results** | `/flights/search` | Displays matching flights with sort (price/departure/duration) and filter (status) options |
| **Forgot Password** | `/auth/forgot-password` | Request password reset email |
| **Login** | `/auth/login` | Email + password login with field-level validation |
| **Register** | `/auth/register` | Registration form with role selection |

### Passenger Pages (requires `PASSENGER` role)

| Page | Route | Description |
|------|-------|-------------|
| **Dashboard** | `/passenger/dashboard` | Greeting, upcoming bookings, recent notifications, booking stats |
| **My Bookings** | `/passenger/my-bookings` | List all bookings with status filter, booking detail view, cancel booking |
| **Notifications** | `/passenger/notifications` | All notifications with read/unread state, mark-all-as-read |
| **Profile** | `/passenger/profile` | Edit name, phone, passport, nationality + change password |

### Booking Flow (requires `PASSENGER` role)

| Step | Route | Description |
|------|-------|-------------|
| **1. Seat Selection** | `/booking/seats/:flightId` | Interactive seat map with class filter (Economy/Business/First), colour-coded availability |
| **2. Passenger Details** | `/booking/passengers/:flightId` | Passenger info form (title, name, DOB, gender, passport, nationality, type) + contact info |
| **3. Payment** | `/booking/payment/:bookingId` | Razorpay checkout integration |
| **4. Confirmation** | `/booking/confirmation/:bookingId` | Success page with PNR code and booking summary |

### Airline Staff Pages (requires `AIRLINE_STAFF` role)

| Page | Route | Description |
|------|-------|-------------|
| **Staff Dashboard** | `/staff/dashboard` | Select airline → view flights, view flight bookings, update flight status (ON_TIME, DELAYED, CANCELLED, DEPARTED, ARRIVED) |

### Admin Pages (requires `ADMIN` role)

| Page | Route | Description |
|------|-------|-------------|
| **Admin Dashboard** | `/admin/dashboard` | Overview with tabs: airlines list, airport list, user management, revenue stats, airline CRUD, broadcast notifications |

---

## Architecture

### Project Structure

```
src/
├── app/
│   ├── core/
│   │   ├── guards/          # authGuard, passengerGuard, staffGuard, adminGuard, guestGuard
│   │   ├── interceptors/    # JWT auth interceptor with token refresh
│   │   ├── models/          # TypeScript interfaces & enums (aligned with backend DTOs)
│   │   └── services/        # HTTP services for all backend APIs
│   │       ├── auth.service.ts
│   │       ├── airline.service.ts
│   │       ├── flight.service.ts
│   │       ├── booking.service.ts
│   │       ├── passenger.service.ts
│   │       ├── seat.service.ts
│   │       ├── payment.service.ts
│   │       └── notification.service.ts
│   ├── features/
│   │   ├── auth/            # Login, Register, Forgot Password
│   │   ├── home/            # Landing page with flight search
│   │   ├── flights/         # Flight search results
│   │   ├── booking/         # Seat selection → Passenger details → Payment → Confirmation
│   │   ├── passenger/       # Dashboard, My Bookings, Notifications, Profile
│   │   ├── staff/           # Airline Staff Dashboard
│   │   └── admin/           # Admin Dashboard
│   └── shared/
│       ├── navbar/          # Global navbar with role-based navigation + notification badge
│       ├── footer/          # Global footer
│       └── unauthorized/    # 403 page for role-mismatch
├── environments/            # API URL + Razorpay key config
├── index.html               # Entry point (loads Inter font, Material Symbols, Razorpay SDK)
└── styles.css               # Global design system
```

### Key Architectural Decisions

- **Standalone Components** — No `NgModule` — all components use `standalone: true`
- **Angular Signals** — Used throughout for reactive state management (replacing BehaviorSubject)
- **Functional Route Guards** — `CanActivateFn` guards for auth, role, and guest-only routes
- **HTTP Interceptor** — Automatically attaches JWT `Bearer` token; handles 401 with token refresh
- **Guest Guard** — Prevents logged-in users from accessing login/register pages; redirects to role-specific dashboard
- **Lazy Loading** — All feature components are lazy-loaded via `loadComponent()`

### Route Guard Summary

| Guard | Behaviour |
|-------|-----------|
| `authGuard` | Requires any logged-in user |
| `passengerGuard` | Requires `PASSENGER` role |
| `staffGuard` | Requires `AIRLINE_STAFF` role |
| `adminGuard` | Requires `ADMIN` role |
| `guestGuard` | Only for unauthenticated users; redirects logged-in users to their dashboard |

---

## API Services

All services call the backend through the API Gateway (`http://localhost:8080`):

| Service | Backend Path | Key Methods |
|---------|-------------|-------------|
| `AuthService` | `/api/v1/auth/*` | login, register, logout, refreshToken, getProfile, updateProfile, changePassword, forgotPassword, resetPassword, getAllUsers, getUsersByRole |
| `AirlineService` | `/api/v1/airlines/*`, `/api/v1/airports/*` | getAllAirlines, getActiveAirlines, createAirline, activateAirline, deactivateAirline, searchAirports |
| `FlightService` | `/api/v1/flights/*` | searchFlights, searchRoundTrip, getFlightsByAirline, updateFlightStatus |
| `BookingService` | `/api/v1/bookings/*` | createBooking, getBookingsByUser, getUpcomingBookings, cancelBooking, getBookingsByFlight |
| `PassengerService` | `/api/v1/passengers/*` | addPassenger, assignSeat, getPassengersByBooking |
| `SeatService` | `/api/v1/seats/*` | getSeatMap, holdSeat, releaseSeat, confirmSeat, getAvailableSeats |
| `PaymentService` | `/api/v1/payments/*` | initiatePayment, verifyPayment, refundPayment, getRevenue |
| `NotificationService` | `/api/v1/notifications/*` | getNotifications, getUnreadCount, markAsRead, markAllAsRead, broadcastNotification |

---

## Design System

- **Primary Color:** `#5b38ff` (Violet) with gradient to `#7448ff` → `#ff8f73` (Coral)
- **Font:** Inter (Google Fonts)
- **Icons:** Google Material Symbols Rounded
- **Border Radius:** 10–24px (rounded, modern aesthetic)
- **Glassmorphism effects** — Cards with subtle box shadows and backdrop blur
- **Micro-animations** — Fade-up animations, spinner loaders, hover transitions
- **Responsive** — Mobile-first grid layouts with media query breakpoints

---

## Important Notes

- **Backend must be running** for any feature to work. Start all microservices (see backend README).
- **Kafka is optional** for the basic booking flow. Without Kafka, email notifications and in-app alerts won't trigger automatically, but payments and bookings still work.
- **Razorpay test mode** — No real money is charged. Use the test card details above.
- **The app uses hash-based routing** (`/#/home`, `/#/auth/login`, etc.) for static hosting compatibility.
