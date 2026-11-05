# DispatchBridge — Delivery & Reconciliation Engine

Full-stack TypeScript web application & installable Progressive Web App (PWA) for multi-tenant B2B dispatch management, barcode/QR intake scanning, offline-first IndexedDB queuing with automatic FIFO synchronization, live GPS corridor tracking, and dock receipt discrepancy reconciliation.

## Architecture & Key Capabilities

- **Frontend (`src/`)**: React 19, TypeScript, Tailwind CSS v4, Lucide React, Recharts, jsPDF, IndexedDB local-first storage (`dispatchbridge_local_first_db`), Service Worker (`public/sw.js`), and full 5-language localization (`en`, `am`, `om`, `ti`, `so`).
- **Backend (`server.ts`, `src/server/`)**: Node.js 22 + Express 4 API server with Vite middleware in development, HMAC SHA-256 session tokens, Fayda e-ID adapter, OTP challenge lifecycle, multi-tenant access controls, and immutable audit logging.
- **Create Dispatch Barcode & QR Intake (`src/components/dispatches/BarcodeIntakeScanner.tsx`, `src/utils/barcodeParser.ts`)**: Device camera `getUserMedia` + `BarcodeDetector` live decoding, USB/Bluetooth hardware barcode wedge input, `×1 / ×5 / ×10` batch multipliers, and smart SKU line merging.
- **Local-First IndexedDB & Auto-Sync (`src/utils/indexedDbStore.ts`, `src/utils/offlineSync.ts`, `src/components/common/OfflineSyncDrawer.tsx`)**: Event-sourced local caching and offline delivery update outbox that automatically replays queued updates in FIFO order when connectivity returns.

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
   npx tsx --test src/utils/barcodeParser.test.ts src/utils/offlineSync.test.ts
   npm test
   npm run build
   ```

## Exporting & Re-Importing in Google AI Studio

- Ensure `.gitignore` is preserved (`node_modules/`, `dist/`, `.aistudio/` are excluded so exports stay lightweight and conflict-free).
- Use `package-lock.json` with `npm` (Node.js 22 runtime on port `3000`).
