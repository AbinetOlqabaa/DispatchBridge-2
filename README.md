# DispatchBridge / DispatchSync — Delivery & Reconciliation Engine

Full-stack TypeScript web application & installable Progressive Web App (PWA) for multi-tenant B2B dispatch management, device camera barcode/QR intake scanning, tactile haptic feedback (Web Vibration API), offline-first IndexedDB queuing with automatic FIFO synchronization, live GPS corridor tracking, Ethiopian Fayda e-ID authentication, 5-language national localization, and dock receipt discrepancy reconciliation.

📖 **Complete Documentation**: Detailed technical specifications, developer guide, API reference, and system architecture are available in [`docs/DISPATCHSYNC_DOCUMENTATION.md`](docs/DISPATCHSYNC_DOCUMENTATION.md).

---

## Architecture & Key Capabilities

- **Frontend (`src/`)**: React 19, TypeScript, Tailwind CSS v4, Lucide React, Recharts, jsPDF, IndexedDB local-first storage (`dispatchbridge_local_first_db`), Service Worker (`public/sw.js`), and full 5-language localization (`en`, `am`, `om`, `ti`, `so`).
- **Backend (`server.ts`, `src/server/`)**: Node.js 22 + Express 4 API server with Vite middleware in development, HMAC SHA-256 session tokens, Fayda e-ID adapter, OTP challenge lifecycle, multi-tenant access controls, and immutable audit logging.
- **Haptic Feedback & Web Vibration API (`src/utils/haptics.ts`)**: Tactile vibration patterns for barcode scanning (`[35]`), dispatch creation (`[50, 40, 80]`), offline sync success (`[40, 60, 40]`), and error alerts (`[70, 50, 70]`) with user toggle.
- **Create Dispatch Barcode & QR Intake (`src/components/dispatches/BarcodeIntakeScanner.tsx`, `src/utils/barcodeParser.ts`)**: Device camera `getUserMedia` + `BarcodeDetector` live decoding, USB/Bluetooth hardware barcode wedge input, `×1 / ×5 / ×10` batch multipliers, and smart SKU line merging.
- **Local-First IndexedDB & Auto-Sync (`src/utils/indexedDbStore.ts`, `src/utils/offlineSync.ts`, `src/components/common/OfflineSyncDrawer.tsx`)**: Event-sourced local caching and offline delivery update outbox that automatically replays queued updates in FIFO order when connectivity returns.
- **5-Language Localization (`src/i18n/translations.ts`)**: 100% dictionary parity (1,228 keys/language = 6,140 total keys) across English, Amharic, Afan Oromo, Tigrinya, and Somali with parameter interpolation.
- **Tablet-First UI/UX**: Dedicated `TabletSidebar` for landscape viewports (`1024x768`, `1180x820`) and responsive swipeable `Navbar` strip for portrait viewports (`768x1024`, `820x1180`) with minimum 44x44px touch targets.

---

## Running Locally

1. Install dependencies with npm:
   ```bash
   npm install
   ```
2. Copy `.env.example` to `.env` and configure any optional environment variables (works out of the box in sandbox development mode).
3. Start the full-stack development server on port `3000`:
   ```bash
   npm run dev
   ```
4. Run TypeScript checks, unit tests, acceptance suite, and production build:
   ```bash
   npm run lint
   npx tsx --test src/utils/haptics.test.ts src/utils/barcodeParser.test.ts src/utils/offlineSync.test.ts
   npm test
   npm run build
   ```

---

## Automated Acceptance Test Results

- **48/48 automated acceptance tests passing with 0 failures** (`tsx test/runTests.ts`).
- **10/10 pure domain unit tests passing** via Node.js test runner.
- **TypeScript strict type-check passing with 0 errors** (`tsc --noEmit`).

---

## Exporting & Re-Importing in Google AI Studio

- Ensure `.gitignore` is preserved (`node_modules/`, `dist/`, `.aistudio/` are excluded so exports stay lightweight and conflict-free).
- Use `package-lock.json` with `npm` (Node.js 22 runtime on port `3000`).
