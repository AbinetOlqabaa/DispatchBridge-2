import { DispatchTotals } from '../utils/reconciliation.ts';

export type UserRole = 'SUPER_ADMIN' | 'BUSINESS_OWNER' | 'SENDER' | 'RECEIVER';

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  phone: string;
  businessId: string;
  isPhoneVerified: boolean;
  createdAt: string;
}

export type PartnerRole = 'RETAILER' | 'SUPPLIER' | 'DISTRIBUTOR' | '3PL_HAULER';

export interface Partner {
  id: string;
  businessId: string;
  name: string;
  code: string;
  role: PartnerRole;
  contactPerson: string;
  email: string;
  phone: string;
  locationAddress: string;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
}

export interface DispatchItem {
  id: string;
  name: string;
  sku: string;
  dispatchedQty: number;
  unit: string; // e.g. 'Units', 'Boxes', 'Crates', 'Pallets', 'Kg'
  unitPrice: number;
  receivedQty?: number;
  damagedQty?: number;
  missingQty?: number;
  itemNotes?: string;
}

export type DispatchStatus =
  | 'DRAFT'
  | 'DISPATCHED'
  | 'IN_TRANSIT'
  | 'VIEWED'
  | 'RECONCILED_MATCH'
  | 'RECONCILED_DISCREPANCY';

export interface Dispatch {
  id: string;
  trackingCode: string;
  businessId: string;
  senderUserId: string;
  senderName: string;
  originLocation: string;
  partnerId: string;
  partnerName: string;
  destinationLocation: string;
  driverName: string;
  driverPhone: string;
  vehiclePlate: string;
  dispatchedAt: string;
  status: DispatchStatus;
  viewedAt?: string;
  viewedBy?: string;
  viewedByName?: string;
  receivedAt?: string;
  receivedBy?: string;
  receivedByName?: string;
  recipientSignature?: string;
  reconciliationNotes?: string;
  items: DispatchItem[];
  totals: DispatchTotals;
  idempotencyKey?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuditEntry {
  id: string;
  timestamp: string;
  actorId: string;
  actorName: string;
  actorRole: UserRole;
  action: string;
  targetType: 'DISPATCH' | 'PARTNER' | 'AUTH' | 'SYSTEM' | 'RECONCILIATION';
  targetId: string;
  details: string;
  checksum: string;
  previousChecksum?: string;
}

export interface SystemDiagnostic {
  appName: string;
  version: string;
  environment: string;
  platformSummary: string;
  isNativeAndroid: boolean;
  pwaInstalledReady: boolean;
  activeAdapter: 'LOCAL_EXPRESS_PERSISTENCE' | 'FIREBASE_FIRESTORE';
  authType: 'EXPRESS_SECURE_SESSION' | 'FIREBASE_AUTH';
  superAdminProvisioned: boolean;
  storageRecordCount: {
    users: number;
    dispatches: number;
    partners: number;
    auditLogs: number;
  };
  pendingProductionConfig: string[];
}
