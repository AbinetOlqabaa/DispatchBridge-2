/**
 * DispatchBridge - Enterprise Business Delivery & Reconciliation Kernel
 */

import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './services/authContext.tsx';
import { api } from './services/api.ts';
import { Dispatch, Partner, AuditEntry, PartnerRole } from './types/index.ts';
import { Shell, ActiveTab } from './components/layout/Shell.tsx';
import { DashboardView } from './components/views/DashboardView.tsx';
import { DispatchesView } from './components/views/DispatchesView.tsx';
import { DispatchDetailModal } from './components/views/DispatchDetailModal.tsx';
import { CreateDispatchModal } from './components/views/CreateDispatchModal.tsx';
import { PartnersView } from './components/views/PartnersView.tsx';
import { AuditView } from './components/views/AuditView.tsx';
import { SystemStatusView } from './components/views/SystemStatusView.tsx';
import { AuthModal } from './components/views/AuthModal.tsx';
import { CheckCircle2, AlertCircle } from 'lucide-react';

function DispatchBridgeApp() {
  const { currentRole, currentUser } = useAuth();

  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [dispatches, setDispatches] = useState<Dispatch[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [selectedDispatch, setSelectedDispatch] = useState<Dispatch | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authDefaultTab, setAuthDefaultTab] = useState<'login' | 'register' | 'bootstrap'>('login');

  // Feedback Notification Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  // Register PWA service worker
  useEffect(() => {
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        console.warn('Service worker registration skipped:', err);
      });
    }
  }, []);

  const loadAllData = async () => {
    setIsLoading(true);
    try {
      const [dispatchesData, partnersData, auditData] = await Promise.all([
        api.getDispatches({ role: currentRole }),
        api.getPartners(),
        api.getAuditLogs(),
      ]);
      setDispatches(dispatchesData);
      setPartners(partnersData);
      setAuditLogs(auditData);
    } catch (err: any) {
      console.error('Failed to load application data:', err);
      showToast('Error loading application data from server', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, [currentRole]);

  // Handle viewing dispatch (records read-receipt if receiver)
  const handleSelectDispatch = async (dispatch: Dispatch) => {
    try {
      const viewer = currentUser
        ? { role: currentRole, id: currentUser.id, name: currentUser.fullName }
        : undefined;

      const freshDispatch = await api.getDispatchById(dispatch.id, viewer);
      setSelectedDispatch(freshDispatch);

      // Update in local dispatches list if status or viewed time changed
      setDispatches((prev) =>
        prev.map((d) => (d.id === freshDispatch.id ? freshDispatch : d))
      );
    } catch (err: any) {
      setSelectedDispatch(dispatch);
    }
  };

  // Handle creating new dispatch
  const handleCreateDispatch = async (
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
    },
    idempotencyKey: string
  ) => {
    const actor = {
      id: currentUser?.id || 'usr_sender_demo',
      name: currentUser?.fullName || 'Authorized Dispatcher',
      role: currentRole,
    };

    const newDispatch = await api.createDispatch({ ...payload, actor }, idempotencyKey);
    setDispatches((prev) => [newDispatch, ...prev]);
    setShowCreateModal(false);
    showToast(`Dispatch ${newDispatch.trackingCode} created successfully!`);
    loadAllData();
  };

  // Handle reconciling dispatch
  const handleReconcileDispatch = async (
    dispatchId: string,
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
    }
  ) => {
    const actor = {
      id: currentUser?.id || 'usr_receiver_demo',
      name: currentUser?.fullName || 'Dock Supervisor',
      role: currentRole,
    };

    const updated = await api.reconcileDispatch(dispatchId, { ...payload, actor });
    setDispatches((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
    setSelectedDispatch(updated);
    showToast(`Reconciliation submitted for ${updated.trackingCode}!`);
    loadAllData();
  };

  // Handle adding partner
  const handleAddPartner = async (payload: {
    name: string;
    code: string;
    role: PartnerRole;
    contactPerson: string;
    email: string;
    phone: string;
    locationAddress: string;
  }) => {
    const actor = {
      id: currentUser?.id || 'usr_owner_demo',
      name: currentUser?.fullName || 'Business Manager',
      role: currentRole,
    };

    const created = await api.createPartner({ ...payload, actor });
    setPartners((prev) => [...prev, created]);
    showToast(`Trading partner "${created.name}" registered successfully!`);
    loadAllData();
  };

  return (
    <Shell
      activeTab={activeTab}
      onSelectTab={(tab) => setActiveTab(tab)}
      onOpenAuth={() => {
        setAuthDefaultTab('login');
        setShowAuthModal(true);
      }}
      onOpenNewDispatch={() => setShowCreateModal(true)}
    >
      {/* Toast Notification Banner */}
      {toast && (
        <div className="fixed top-18 right-4 z-50 animate-bounce">
          <div
            className={`px-4 py-2.5 rounded-xl shadow-xl border flex items-center gap-2 text-xs font-semibold ${
              toast.type === 'success'
                ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-200'
                : 'bg-rose-950/90 border-rose-500/50 text-rose-200'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400" />
            )}
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* Primary Tab Content */}
      {activeTab === 'dashboard' && (
        <DashboardView
          dispatches={dispatches}
          partners={partners}
          isLoading={isLoading}
          onRefresh={loadAllData}
          onOpenNewDispatch={() => setShowCreateModal(true)}
          onSelectDispatch={handleSelectDispatch}
          onGoToDispatches={() => setActiveTab('dispatches')}
          onGoToPartners={() => setActiveTab('partners')}
          onGoToStatus={() => setActiveTab('status')}
          onOpenBootstrapAdmin={() => {
            setAuthDefaultTab('bootstrap');
            setShowAuthModal(true);
          }}
        />
      )}

      {activeTab === 'dispatches' && (
        <DispatchesView
          dispatches={dispatches}
          isLoading={isLoading}
          onRefresh={loadAllData}
          onOpenNewDispatch={() => setShowCreateModal(true)}
          onSelectDispatch={handleSelectDispatch}
        />
      )}

      {activeTab === 'partners' && (
        <PartnersView partners={partners} onAddPartner={handleAddPartner} />
      )}

      {activeTab === 'audit' && (
        <AuditView logs={auditLogs} isLoading={isLoading} onRefresh={loadAllData} />
      )}

      {activeTab === 'status' && <SystemStatusView />}

      {/* Modals */}
      <DispatchDetailModal
        dispatch={selectedDispatch}
        onClose={() => setSelectedDispatch(null)}
        onReconcile={handleReconcileDispatch}
      />

      {showCreateModal && (
        <CreateDispatchModal
          partners={partners}
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateDispatch}
        />
      )}

      <AuthModal
        isOpen={showAuthModal}
        defaultTab={authDefaultTab}
        onClose={() => setShowAuthModal(false)}
      />
    </Shell>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <DispatchBridgeApp />
    </AuthProvider>
  );
}
