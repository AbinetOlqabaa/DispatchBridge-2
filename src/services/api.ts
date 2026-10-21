/**
 * DispatchBridge Client API Adapter
 * Handles network requests, idempotency tokens, error handling, and response mapping.
 */

import {
  Dispatch,
  Partner,
  AuditEntry,
  SystemDiagnostic,
  User,
  UserRole,
} from '../types/index.ts';

class ApiService {
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers = new Headers(options.headers || {});
    headers.set('Content-Type', 'application/json');

    const response = await fetch(endpoint, {
      ...options,
      headers,
    });

    const result = await response.json().catch(() => ({
      success: false,
      error: `Network error or invalid server response (${response.status})`,
    }));

    if (!response.ok || !result.success) {
      throw new Error(result.error || `HTTP error ${response.status}`);
    }

    return result.data as T;
  }

  // System status & environment diagnostic
  async getSystemStatus(): Promise<SystemDiagnostic> {
    return this.request<SystemDiagnostic>('/api/system/status');
  }

  // Authentication
  async login(credentials: { email: string; password: string; roleOverride?: UserRole }): Promise<{ user: User; token: string }> {
    return this.request<{ user: User; token: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  }

  async register(payload: {
    fullName: string;
    email: string;
    password: string;
    phone: string;
    role: UserRole;
    businessName: string;
  }): Promise<{ user: User; token: string }> {
    return this.request<{ user: User; token: string }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async resetPassword(email: string): Promise<string> {
    const res = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    return data.message || 'Password reset instructions dispatched.';
  }

  async verifyPhone(userId: string, code: string): Promise<User> {
    const res = await this.request<{ user: User }>('/api/auth/verify-phone', {
      method: 'POST',
      body: JSON.stringify({ userId, code }),
    });
    return res.user;
  }

  async bootstrapSuperAdmin(payload: {
    bootstrapSecret: string;
    email: string;
    fullName: string;
    password: string;
    phone: string;
  }): Promise<{ user: User; token: string }> {
    return this.request<{ user: User; token: string }>('/api/auth/bootstrap-superadmin', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // Dispatches
  async getDispatches(params?: { role?: UserRole; partnerId?: string; status?: string }): Promise<Dispatch[]> {
    const query = new URLSearchParams();
    if (params?.role) query.set('role', params.role);
    if (params?.partnerId) query.set('partnerId', params.partnerId);
    if (params?.status) query.set('status', params.status);

    const queryString = query.toString() ? `?${query.toString()}` : '';
    return this.request<Dispatch[]>(`/api/dispatches${queryString}`);
  }

  async getDispatchById(id: string, viewer?: { role: UserRole; id: string; name: string }): Promise<Dispatch> {
    const query = new URLSearchParams();
    if (viewer) {
      query.set('role', viewer.role);
      query.set('userId', viewer.id);
      query.set('userName', viewer.name);
    }
    const queryString = query.toString() ? `?${query.toString()}` : '';
    return this.request<Dispatch>(`/api/dispatches/${id}${queryString}`);
  }

  async createDispatch(
    payload: {
      originLocation: string;
      partnerId: string;
      destinationLocation: string;
      driverName: string;
      driverPhone: string;
      vehiclePlate: string;
      items: Array<{
        name: string;
        sku: string;
        dispatchedQty: number;
        unit: string;
        unitPrice: number;
      }>;
      actor: { id: string; name: string; role: UserRole };
    },
    idempotencyKey?: string
  ): Promise<Dispatch> {
    const headers: Record<string, string> = {};
    if (idempotencyKey) {
      headers['x-idempotency-key'] = idempotencyKey;
    }

    return this.request<Dispatch>('/api/dispatches', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
  }

  async reconcileDispatch(
    id: string,
    payload: {
      receivedItems: Array<{
        id: string;
        receivedQty: number;
        damagedQty: number;
        missingQty: number;
        itemNotes?: string;
      }>;
      recipientSignature: string;
      reconciliationNotes: string;
      actor: { id: string; name: string; role: UserRole };
    }
  ): Promise<Dispatch> {
    return this.request<Dispatch>(`/api/dispatches/${id}/reconcile`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // Partners
  async getPartners(): Promise<Partner[]> {
    return this.request<Partner[]>('/api/partners');
  }

  async createPartner(payload: {
    name: string;
    code: string;
    role: Partner['role'];
    contactPerson: string;
    email: string;
    phone: string;
    locationAddress: string;
    actor: { id: string; name: string; role: UserRole };
  }): Promise<Partner> {
    return this.request<Partner>('/api/partners', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // Audit Logs
  async getAuditLogs(): Promise<AuditEntry[]> {
    return this.request<AuditEntry[]>('/api/audit');
  }
}

export const api = new ApiService();
