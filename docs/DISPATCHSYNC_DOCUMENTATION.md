# DispatchSync / DispatchBridge — Comprehensive System Documentation

Welcome to the official technical and operational documentation for **DispatchBridge / DispatchSync**, a production-grade, multi-tenant B2B delivery management, dispatch intake, and dock reconciliation platform with offline-first PWA capabilities, camera barcode scanning, tactile haptic feedback, live GPS corridor telemetry, Fayda e-ID authentication, and 5-language localization.

---

## Table of Contents

1. [Executive Overview & System Mission](#1-executive-overview--system-mission)
2. [Architecture & Technology Stack](#2-architecture--technology-stack)
3. [Installation & System Requirements](#3-installation--system-requirements)
4. [Configuration & Environment Variables](#4-configuration--environment-variables)
5. [Basic Usage Guide](#5-basic-usage-guide)
   - [User Roles & Access Levels](#user-roles--access-levels)
   - [Creating a Dispatch](#creating-a-dispatch)
   - [Driver Transit & Real-Time Tracking](#driver-transit--real-time-tracking)
   - [Dock Manifest Reconciliation & Digital Sign-off](#dock-manifest-reconciliation--digital-sign-off)
   - [Discrepancy Resolution & Audit Trail](#discrepancy-resolution--audit-trail)
6. [Advanced Features](#6-advanced-features)
   - [Tactile Vibration & Haptic Feedback Engine](#tactile-vibration--haptic-feedback-engine)
   - [Camera & Hardware Barcode/QR Intake Engine](#camera--hardware-barcodeqr-intake-engine)
   - [Local-First IndexedDB Caching & FIFO Sync Outbox](#local-first-indexeddb-caching--fifo-sync-outbox)
   - [5-Language National Localization Engine](#5-language-national-localization-engine)
   - [Ethiopian Fayda e-ID Verification & Cryptographic OTP](#ethiopian-fayda-e-id-verification--cryptographic-otp)
   - [Tablet-First Responsive Layouts (Portrait & Landscape)](#tablet-first-responsive-layouts-portrait--landscape)
7. [Developer & Extension Guide](#7-developer--extension-guide)
   - [Project Directory Structure](#project-directory-structure)
   - [Domain Finite State Machine (FSM)](#domain-finite-state-machine-fsm)
   - [RESTful API Endpoints](#restful-api-endpoints)
   - [IndexedDB Storage Model](#indexeddb-storage-model)
   - [Automated Testing & Quality Verification](#automated-testing--quality-verification)
   - [Production Build & Staging Deployment](#production-build--staging-deployment)

---

## 1. Executive Overview & System Mission

In high-volume B2B wholesale distribution, logistics hubs and receiving docks suffer severe financial losses and administrative disputes due to unverified shipments, transit shortages, damaged cargo, and delayed discrepancy claims. Traditional paper manifests fail to prove when or where cargo discrepancies occurred.

**DispatchBridge / DispatchSync** resolves this through an immutable, event-driven chain of custody:
- **Dispatched Truth**: Senders lock down itemized line quantities, serial/lot numbers, and unit values. Quantities cannot be modified after departure.
- **View Receipts**: As soon as a recipient or driver views the manifest, a cryptographic view receipt records timestamp, IP, and actor.
- **Immediate Dock Reconciliation**: Receiving dock workers verify cargo line by line, record damaged units or shortages, attach photo evidence with SHA-256 hashes, and sign with digital glass signatures.
- **Offline Reliability**: Field drivers and warehouse staff operating in remote or low-connectivity zones can scan cargo, update delivery milestones, and draft dispatches locally in IndexedDB, which automatically synchronizes via FIFO queue upon network reconnection.
- **Inclusive Accessibility**: Full translation across 5 national languages (English, Amharic, Afan Oromo, Tigrinya, and Somali) ensuring warehouse personnel work in their native tongue.

---

## 2. Architecture & Technology Stack

The application employs a unified full-stack TypeScript architecture running in Node.js 22:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        React 19 Client UI                              │
│   Tailwind CSS v4 • Lucide React • Recharts • jsPDF • PWA (sw.js)      │
└──────────────────────┬──────────────────────────┬──────────────────────┘
                       │                          │
           ┌───────────▼───────────┐  ┌───────────▼───────────┐
           │   Web Vibration API   │  │   BarcodeDetector     │
           │   (Haptics Engine)    │  │   Camera Stream / USB │
           └───────────────────────┘  └───────────────────────┘
                       │                          │
                       └───────────┬──────────────┘
                                   │
                    ┌──────────────▼──────────────┐
                    │    IndexedDB Local Store    │
                    │ (dispatches, syncOutbox)    │
                    └──────────────┬──────────────┘
                                   │ (Automatic FIFO Replay)
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        Express 4 Backend API                           │
│   Node.js 22 • Vite Middleware • HMAC SHA-256 Auth • Fayda e-ID Adapter │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
                    ┌──────────────▼──────────────┐
                    │    Persistence Engine       │
                    │  (sandboxStore / DB)        │
                    └─────────────────────────────┘
```

- **Frontend**:
  - **Framework**: React 19 SPA with TypeScript.
  - **Styling**: Tailwind CSS v4 with unified design system, dark/light theme persistence, and zero page-level horizontal overflow.
  - **Local Persistence**: IndexedDB via custom `IndexedDbStorageBackend` (`dispatchbridge_local_first_db`) with fallback to memory backend for testing.
  - **Haptics**: W3C Web Vibration API (`navigator.vibrate`) with user toggle.
  - **Sensors**: Camera `MediaStream` + `BarcodeDetector` with fallback software pattern decoder.
  - **Charts & Reports**: Recharts 2.x for trend graphs and SVG donut charts; jsPDF for client-side waybill PDF generation.
- **Backend**:
  - **Server**: Express 4 running inside `server.ts`.
  - **Authentication**: HMAC-SHA256 session tokens with expiration and signature validation; timing-safe constant-time string comparisons.
  - **National Identity**: Fayda e-ID verification adapter with Ethiopian national ID formats (FAN 16-digit, FIN 12-digit) and masking.
  - **OTP Security**: 6-digit cryptographic challenge store with 5-minute expiry, max 3 attempts, purpose binding (`REGISTRATION`, `PASSWORD_RESET`, `PROFILE_CHANGE`), and rate limiting.

---

## 3. Installation & System Requirements

### Prerequisites
- **Node.js**: Version 22.x LTS or higher
- **Package Manager**: `npm` (v10+ recommended)
- **Supported Browsers**: Chrome/Chromium 90+, Edge 90+, Safari 16+, Firefox 100+
- **Camera Access**: HTTPS or `localhost` (required by browser security policies for `navigator.mediaDevices.getUserMedia`)
- **Vibration Support**: Supported mobile/tablet devices with standard vibration motors

### Setup Steps

1. Clone the repository into your local or development workspace:
   ```bash
   git clone https://github.com/AbinetOlqabaa/DispatchBridge-5.git
   cd DispatchBridge-5
   ```

2. Install all required dependencies:
   ```bash
   npm install
   ```

3. Initialize environment variables:
   ```bash
   cp .env.example .env
   ```

4. Start the full-stack development server:
   ```bash
   npm run dev
   ```
   The application will boot at `http://localhost:3000`.

---

## 4. Configuration & Environment Variables

The project uses `.env` for operational settings. Below are the supported environment variables:

| Variable | Default Value | Description |
|---|---|---|
| `PORT` | `3000` | Local port for Express API and Vite server. |
| `NODE_ENV` | `development` | Environment mode (`development`, `production`, `test`). |
| `GEMINI_API_KEY` | *(Configured via AI Studio secrets)* | Optional Gemini AI API token for automated recommendations. |
| `APP_URL` | `http://localhost:3000` | Canonical app URL for OAuth callbacks and share tokens. |
| `ENABLE_FAYDA_SIMULATION` | `true` | When `true`, allows testing Ethiopian Fayda e-ID verification with mock test identities. When `false`, requires live national Fayda endpoints. |
| `SESSION_HMAC_SECRET` | *(Auto-generated if missing)* | Symmetric secret for signing session authorization tokens. |

---

## 5. Basic Usage Guide

### User Roles & Access Levels

DispatchBridge enforces strict Role-Based Access Control (RBAC):

1. **SUPER_ADMIN**:
   - Manages tenant accounts, activates/suspends users, views global audit logs, inspects diagnostic staging checks, and configures national identity adapters.
   - Built-in lockout protection prevents demoting or suspending the final active Super Administrator.
2. **BUSINESS_OWNER**:
   - Manages business settings, invites team members via cryptographic invitation tokens, reviews executive performance analytics (discrepancy rates, loss causes, carrier lead times), and manages warehouses.
3. **SENDER (Dispatcher)**:
   - Creates and submits new dispatches, uses camera barcode intake for rapid SKU entry, tracks live transit GPS coordinates, and reviews/resolves dock discrepancy claims.
4. **RECEIVER (Dock Master / Warehouse Staff)**:
   - Opens incoming shipments, inspects line quantities against manifest, reports shortages/damages, uploads cargo damage photos with SHA-256 hashes, signs receipts with digital signature, and exports PDF receipts.

> **Tip**: In development/sandbox mode, use the **Quick Role Sandbox Switcher** in the top navigation bar to seamlessly alternate between roles without manual logins.

---

### Creating a Dispatch

1. Navigate to **Dispatches** and click **New Dispatch** (or use keyboard shortcut `Ctrl+N`).
2. **Step 1: Header Information**:
   - Select destination partner dock from registered delivery partners.
   - Set expected delivery date and carrier details (Driver name, phone, license plate).
   - Enter dispatch notes or handling requirements (e.g., *Fragile Glassware - Keep Upright*).
3. **Step 2: Cargo Lines Intake**:
   - **Camera Barcode Intake**: Click **Scan Barcode / QR** to open the live intake scanner. Point your camera at product barcodes or pallet QR codes. Items instantly resolve against your catalog and populate the cargo list.
   - **Hardware Scanner**: Plug in any standard USB or Bluetooth barcode scanner; scanned barcodes auto-populate.
   - **Batch Multipliers**: Select `×1`, `×5`, or `×10` to scan multiple cartons per scan.
   - **Line Items Grid**: Manually adjust quantities, units (`cases`, `cartons`, `pallets`), or unit values ($).
4. **Step 3: Review & Commit**:
   - Inspect total cargo lines, total item count, and gross manifest value.
   - Click **Create Dispatch**. Haptic confirmation buzzes, and the manifest transitions to `DISPATCHED` with a unique dispatch number (e.g., `DSP-2026-004`).

---

### Driver Transit & Real-Time Tracking

1. Open any active dispatch in `IN_TRANSIT` status.
2. **Interactive SVG Tracking Map**:
   - Displays real-time GPS coordinates of the delivery vehicle, origin hub, and destination dock.
   - Visualizes planned transit corridor against actual breadcrumb waypoints.
   - Displays speed (`km/h`), heading, distance remaining, and estimated time of arrival.
   - 1-click **Copy Lat/Lng** and external Google Maps routing integration.
3. **Transit Checkpoints**:
   - Drivers can tap **Scan Transit Checkpoint** to scan manifest QR codes at intermediate weigh stations, toll gates, or transfer hubs.
   - Checkpoint updates can be recorded offline and will queue automatically in IndexedDB.

---

### Dock Manifest Reconciliation & Digital Sign-off

1. The receiving warehouse manager opens the dispatch record via private login or direct secure link (`/?token=<unguessable_token>`).
2. The system immediately logs a **View Receipt** recording arrival timestamp.
3. The dock inspector clicks **Reconcile Shipment**:
   - **Quantity Received**: Enters physical quantity unloaded at dock.
   - **Item Condition**: Selects `GOOD`, `DAMAGED`, or `MISSING`.
   - **Discrepancy Reporting**: If received quantity is less than dispatched quantity, the system flags a **Shortage**. If items are broken, select **Damaged**.
   - **Photo Evidence**: Click **Attach Damage Photo** to capture or upload high-resolution dock images. The client generates a SHA-256 cryptographic hash of the image file to prevent tampering.
   - **Digital Glass Signature**: The dock supervisor draws their signature on the touch-enabled canvas sign-off pad.
4. Click **Confirm Receipt & Sign Off**.

---

### Discrepancy Resolution & Audit Trail

1. If discrepancies are recorded, the dispatch status updates to `PARTIALLY_RECEIVED` and a new **Discrepancy Case** opens.
2. The sender dispatcher receives an immediate in-app and outbox notification.
3. The sender reviews reported damage photos and notes, then selects a resolution:
   - `CREDIT_MEMO`: Issues a financial credit for damaged or short items.
   - `REPLACE_ITEMS`: Schedules a replacement shipment.
   - `ACCEPT_VARIANCE`: Accepts transit variance within allowable tolerance.
4. Once acknowledged, the manifest transitions to `RECONCILED`.
5. Every single event is permanently stored in the **Immutable Audit Log** with actor ID, timestamp, IP address, and payload snapshot.

---

## 6. Advanced Features

### Tactile Vibration & Haptic Feedback Engine

DispatchBridge includes a dedicated **Haptics Service** (`src/utils/haptics.ts`) built upon the W3C Web Vibration API (`navigator.vibrate`) to deliver physical sensory confirmation to warehouse workers wearing gloves or operating in noisy environments:

| Action | Pattern | Duration / Rhythm | Description |
|---|---|---|---|
| **Barcode Scanned** | `[35]` | 35ms crisp pulse | Instant tactile confirmation that a SKU barcode or QR was decoded. |
| **Dispatch Created** | `[50, 40, 80]` | 170ms cadence | Rhythmic confirmation that a manifest was committed. |
| **Offline Sync Success**| `[40, 60, 40]` | 140ms dual-pulse | Notification that queued offline mutations synchronized to cloud. |
| **Error / Invalid Scan**| `[70, 50, 70]` | 190ms urgent buzz | High-priority vibration alerting worker to invalid input. |
| **Light UI Tap** | `[15]` | 15ms light tap | Subtle button tap feedback. |

- **User Preference**: A haptic feedback toggle button (`Vibrate` / `VibrateOff` icons) is provided directly in the barcode scanner header and saved to `localStorage` (`dispatchbridge_haptics_enabled`).
- **Safe Fallback**: Fully guarded against non-browser environments or unsupported devices without throwing exceptions.

---

### Camera & Hardware Barcode/QR Intake Engine

Located at `src/components/dispatches/BarcodeIntakeScanner.tsx` and `src/utils/barcodeParser.ts`:
- **Dual Intake Modes**:
  1. **Live Camera Stream**: Uses `navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })` paired with the modern browser `BarcodeDetector` API. Detects `code_128`, `qr_code`, `ean_13`, `upc_a`, `data_matrix`, etc.
  2. **Hardware Barcode Wedge / Manual Input**: Listens for fast keystrokes from USB or Bluetooth barcode guns with Enter key completion.
- **Payload Intelligence**:
  - Automatically identifies single SKU barcodes (`SKU-GLS-101`) and multi-item pallet QR JSON formats:
    ```json
    {
      "items": [
        { "sku": "SKU-GLS-101", "itemName": "Glass Olive Oil Bottles", "quantity": 10 }
      ]
    }
    ```
- **Smart Line Merging**: Automatically matches scanned items against existing line items. If a SKU already exists, it increments `quantitySent` by the selected multiplier rather than duplicating rows. Blank starter rows are cleanly replaced.

---

### Local-First IndexedDB Caching & FIFO Sync Outbox

Located at `src/utils/indexedDbStore.ts` and `src/utils/offlineSync.ts`:
- **Database Name**: `dispatchbridge_local_first_db` (Version 1).
- **Stores**:
  1. `dispatches`: Local replica of manifests, lines, partners, and discrepancies with index on `status`.
  2. `referenceData`: Cached partner catalogs, dock locations, and user profiles.
  3. `syncOutbox`: Persistent queue of pending mutations with index on `timestamp` for strict FIFO ordering.
- **Optimistic UI Updates**: When offline, creating a dispatch or logging a transit checkpoint immediately updates the local IndexedDB state and updates UI counters.
- **Auto-Sync Engine**: Listens to browser `online` and `offline` events. When connectivity returns:
  1. Flushes `syncOutbox` items in chronological order via HTTP replay.
  2. Triggers `hapticFeedback.syncSuccess()` upon clean drain.
  3. Displays sync status drawer with progress indicator (`OfflineSyncDrawer.tsx`).

---

### 5-Language National Localization Engine

DispatchBridge features 100% dictionary parity across 5 national languages:

1. **English (`en`)** — Default international language.
2. **Amharic (`am` / አማርኛ)** — Ethiopian federal working language (Ge'ez script).
3. **Afan Oromo (`om` / Afaan Oromoo)** — Widely spoken national language (Qubee Latin script).
4. **Tigrinya (`ti` / ትግርኛ)** — Northern regional language (Ge'ez script).
5. **Somali (`so` / Soomaali)** — Eastern regional language (Latin script).

- **Coverage**: **1,228 keys per language** (**6,140 total dictionary entries**) with zero missing keys and automated bidirectional parity tests.
- **Parameter Interpolation**: Handles dynamic templates such as `Item {sku} quantity updated to {quantity}` without breaking native grammar.
- **Seed Data Mapping**: `DYNAMIC_SEED_MAP` translates backend database records (partner names, dock addresses, cities, cargo descriptions, audit actions) on the fly so UI displays 100% in the chosen language.
- **Public Recipient Portal**: External partners accessing manifests via share tokens can switch languages independently without needing an account.

---

### Ethiopian Fayda e-ID Verification & Cryptographic OTP

Located at `src/server/adapters/faydaAdapter.ts` and `src/server/adapters/otpAdapter.ts`:
- **Format Validation**:
  - **FAN (Fayda Identification Number)**: 16 digits formatted as `XXXX-XXXX-XXXX-XXXX`.
  - **FIN (Fayda Individual Number)**: 12 digits formatted as `XXXX-XXXX-XXXX`.
- **Data Protection & Masking**: Raw national ID numbers are never sent over public API endpoints or stored in logs. Masking utilities display only safe suffixes: `•••• •••• •••• 9012`.
- **Cryptographic OTP Challenges**:
  - Secure 6-digit random verification tokens generated via `crypto.randomInt`.
  - 5-minute time-to-live with max 3 attempts before permanent invalidation.
  - Purpose binding prevents token recycling across different endpoints.
  - Step-up verification required for sensitive actions (profile password changes, phone number migration).

---

### Tablet-First Responsive Layouts (Portrait & Landscape)

Designed specifically for 10-inch to 12-inch warehouse tablets (e.g., iPad 10th Gen `820x1180`, iPad Air `820x1180`, Samsung Galaxy Tab `800x1280`):
- **Tablet Landscape (`1024x768`, `1180x820`)**:
  - Automatically mounts a dedicated `TabletSidebar` with 240px fixed width, role switcher, navigation tabs, and system controls.
  - Suppresses horizontal top bar to maximize vertical screen real estate for dense cargo tables.
  - 3-column metric cards (`lg:grid-cols-3`).
- **Tablet Portrait (`768x1024`, `820x1180`)**:
  - Mounts a streamlined horizontal Tablet Navigation Strip with smooth swipe scrolling and visual right fade indicator.
  - 2-column balanced metric cards (`sm:grid-cols-2`).
- **Touch-First Accessibility**: All buttons, table action triggers, and modal dismiss buttons enforce a minimum **44x44px touch target** adhering to WCAG 2.1 AA.
- **Bounded Overflow**: Tables utilize `.scrollbar-thin` overflow containers with sticky headers so headers remain visible when scrolling large manifests.

---

## 7. Developer & Extension Guide

### Project Directory Structure

```
├── .ai/                       # Architectural specifications & release checklists
├── docs/                      # Comprehensive technical documentation
│   └── DISPATCHSYNC_DOCUMENTATION.md
├── public/                    # PWA Web App Manifest, icons, and sw.js
├── src/
│   ├── components/            # Reusable UI component modules
│   │   ├── common/            # Navbar, Sidebar, OfflineSyncDrawer, Toast
│   │   ├── dispatches/        # BarcodeIntakeScanner, QrScannerModal, Maps
│   │   ├── layout/            # Layout wrappers and tablet navigation
│   │   └── reconciliation/    # Digital signature pad, photo upload modal
│   ├── context/               # AuthContext, LanguageContext, ThemeContext
│   ├── domain/                # Pure business logic and calculation helpers
│   ├── i18n/                  # 5-language translation dictionary & engine
│   ├── pages/                 # Route page components
│   │   ├── auth/              # Login, Register, ForgotPassword
│   │   ├── dispatches/        # DispatchList, DispatchDetail, CreateDispatch
│   │   ├── admin/             # UserManagement, SystemDiagnostics
│   │   └── reports/           # ExecutiveAnalyticsPage
│   ├── server/                # Express API routes, adapters, and security
│   │   ├── adapters/          # sandboxStore, faydaAdapter, otpAdapter
│   │   └── security.ts        # HMAC tokens, timing-safe checks
│   ├── services/              # Recommendation and analytics engines
│   ├── types/                 # TypeScript interfaces and domain schemas
│   └── utils/                 # Haptics, IndexedDB, BarcodeParser, MapCache
├── test/                      # Acceptance test runner & integration test suite
│   └── runTests.ts            # 48 comprehensive automated tests
├── server.ts                  # Backend server entry point
├── package.json               # Node.js project manifest & scripts
├── tsconfig.json              # TypeScript compilation rules
└── vite.config.ts             # Vite bundler & PWA configuration
```

---

### Domain Finite State Machine (FSM)

Shipments follow a strict, unidirectional state transition model:

```
[ DRAFT ]
   │
   ▼ (Submit Manifest)
[ SUBMITTED ]
   │
   ▼ (Driver Departs Dock)
[ DISPATCHED ] ──────► [ IN_TRANSIT ]
   │                        │
   ▼ (Recipient Opens Link) ▼ (Dock Arrival)
[ VIEWED ] ──────────► [ OUT_FOR_DELIVERY ]
   │                        │
   ├────────────────────────┘
   │
   ▼ (Reconciliation Verification)
   ├─── If Discrepancies (Short / Damaged) ──► [ PARTIALLY_RECEIVED ]
   │                                                    │
   │                                                    ▼ (Resolution Memo)
   └─── If Intact & Full ────────────────────► [ RECEIVED ] ──► [ RECONCILED ]
```

---

### RESTful API Endpoints

All endpoints support JSON payloads and respond with standard HTTP status codes:

#### Authentication & Identity
- `POST /api/auth/login-mobile` — Authenticate via E.164 phone and password.
- `POST /api/auth/register-fayda` — Register new user linked to verified Fayda e-ID.
- `POST /api/auth/otp/request` — Initiate 6-digit OTP challenge.
- `POST /api/auth/otp/verify` — Verify OTP challenge.
- `POST /api/auth/bootstrap-superadmin` — Redeem one-time bootstrap token.

#### Dispatches & Reconciliation
- `GET /api/dispatches` — List dispatches for active tenant.
- `GET /api/dispatches/:id` — Get dispatch details (or via `?token=...` for guest).
- `POST /api/dispatches` — Create new multi-line dispatch.
- `POST /api/dispatches/:id/view-receipt` — Log recipient view receipt.
- `POST /api/dispatches/:id/transit-scan` — Record transit checkpoint.
- `POST /api/dispatches/:id/reconciliation` — Submit dock reconciliation & discrepancies.
- `POST /api/dispatches/:id/discrepancies/:caseId/resolve` — Acknowledge & resolve discrepancy.

#### User Governance & Reports
- `GET /api/admin/users` — Super admin user management query (masked IDs).
- `POST /api/admin/users/:id/suspend` — Suspend user with justification reason.
- `POST /api/admin/users/:id/reactivate` — Reactivate suspended user.
- `GET /api/reports/analytics` — Executive delivery success & loss analysis.

---

### IndexedDB Storage Model

The local IndexedDB database `dispatchbridge_local_first_db` exposes helper functions in `src/utils/indexedDbStore.ts`:

```typescript
// Open connection to IndexedDB
const db = await openLocalDatabase();

// Cache dispatches for offline reading
await cacheDispatchesInDb(dispatches);

// Retrieve dispatch while offline
const localDispatch = await getCachedDispatchByIdFromDb(dispatchId);

// Enqueue offline delivery update in outbox
await enqueueOfflineUpdate({
  type: 'TRANSIT_SCAN',
  dispatchId: 'dsp_001',
  method: 'POST',
  url: '/api/dispatches/dsp_001/transit-scan',
  payload: { checkpointLocation: 'Gate 4', status: 'IN_TRANSIT' }
});

// Replay queue upon reconnection
const syncSummary = await replayOfflineQueue();
```

---

### Automated Testing & Quality Verification

DispatchBridge maintains an exhaustive automated test suite covering unit logic, security rules, RBAC isolation, identity workflows, haptics, and end-to-end integration:

```bash
# 1. Run all 48 acceptance & integration tests:
npm test

# 2. Run unit tests using Node.js native test runner:
npx tsx --test src/utils/haptics.test.ts src/utils/barcodeParser.test.ts src/utils/offlineSync.test.ts

# 3. Run TypeScript typecheck:
npm run lint
```

#### Test Suite Breakdown (48 Automated Tests):
- **Layer 1: Unit Tests**: Decimal precision, negative quantity rejection, FSM transitions, HMAC token generation & verification, bootstrap token single-use.
- **Layer 2: Tenant Isolation**: Cross-tenant data isolation, receiver tamper prevention, immutable `quantitySent`.
- **Layer 3: Workflow Integration**: Multi-line dispatch creation, idempotency key deduplication, view receipts, dock reconciliation, discrepancy resolution, audit logs, and in-app notifications.
- **Layer 4: Hardware & Sensors**: SVG GPS tracking, offline map caching, planned vs. actual polylines, digital signatures, damage photo SHA-256 hashes, outbox SMS/webhook gateways.
- **Layer 5: Tablet UX Boundaries**: Multi-viewport density, table bounding, landscape sidebar vs. portrait navigation strip contracts.
- **Layer 6: Fayda Identity & Security**: FAN/FIN validation & masking, OTP lifecycle, mobile E.164 normalization, forgot password, profile photo validation, super-admin lockout protection.
- **Layer 7: Governance & Analytics**: Team invitations, token acceptance, executive reconciliation analytics.
- **Layer 8: Localization**: 5 national languages registry, 100% dictionary bidirectional parity (6,140 entries), parameter interpolation, native script rendering.
- **Layer 9: Barcode Intake & Offline Sync**: Camera/wedge barcode parsing, multi-item QR parsing, SKU line merging, local-first IndexedDB caching, and optimistic outbox replay.
- **Layer 10: Web Vibration API**: Barcode scan pulse `[35]`, dispatch confirmation `[50, 40, 80]`, sync success `[40, 60, 40]`, error alert `[70, 50, 70]`, and user preference toggles.

---

### Production Build & Staging Deployment

To produce an optimized production bundle:

```bash
npm run build
```

This compiles client TypeScript assets to `/dist` and validates all bundle chunks. To execute the production server:

```bash
npm start
```
*(Runs `node server.ts` hosting both Express API endpoints and Vite production static assets).*

---

## 8. Summary & Maintenance

DispatchBridge represents a complete, hardened, and accessible solution for modern logistics and freight reconciliation. For maintenance inquiries or technical extensions, consult the `.ai/` architecture folder and this guide.
