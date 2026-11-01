import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext.js';
import { useLanguage } from '../../context/LanguageContext.js';
import { api } from '../../services/api.js';
import { PhoneVerificationModal } from '../../components/auth/PhoneVerificationModal.js';
import {
  User,
  Shield,
  KeyRound,
  Phone,
  Mail,
  Building,
  CheckCircle,
  AlertTriangle,
  Lock,
  Eye,
  EyeOff,
  RefreshCw,
  Building2,
  Check,
} from 'lucide-react';

export function ProfilePage() {
  const { user, login } = useAuth();
  const { t } = useLanguage();

  // Profile Edit State
  const [name, setName] = useState(user?.name || '');
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber || '');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Password Change State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Business Switch State
  const [switchLoading, setSwitchLoading] = useState(false);
  const [switchError, setSwitchError] = useState<string | null>(null);

  // Phone Verification Modal
  const [isPhoneModalOpen, setIsPhoneModalOpen] = useState(false);

  if (!user) {
    return (
      <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-2xl max-w-lg mx-auto my-12">
        <h2 className="text-base font-bold text-white">Sign In Required</h2>
        <p className="text-xs text-slate-400 mt-2">
          Please sign in to view and manage your profile settings.
        </p>
      </div>
    );
  }

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError(null);
    setProfileSuccess(false);

    try {
      setProfileSaving(true);
      await api.updateProfile({ name: name.trim(), phoneNumber: phoneNumber.trim() });
      setProfileSuccess(true);
      setTimeout(() => setProfileSuccess(false), 3000);
    } catch (err: any) {
      setProfileError(err.message || 'Failed to update profile.');
    } finally {
      setProfileSaving(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(false);

    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirmation do not match.');
      return;
    }

    try {
      setPasswordSaving(true);
      await api.changePassword(currentPassword, newPassword);
      setPasswordSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordSuccess(false), 4000);
    } catch (err: any) {
      setPasswordError(err.message || 'Failed to change password.');
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleSwitchBusiness = async (bizId: string) => {
    if (bizId === user.businessId) return;
    try {
      setSwitchLoading(true);
      setSwitchError(null);
      await api.switchBusiness(bizId);
      window.location.reload();
    } catch (err: any) {
      setSwitchError(err.message || 'Failed to switch business.');
    } finally {
      setSwitchLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl backdrop-blur-md flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold text-lg uppercase">
            {user.name.charAt(0)}
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">
              {t('nav.profile', 'Profile & Security')}
            </h1>
            <p className="text-xs text-slate-400">
              Account identity, multi-business memberships, and security credentials
            </p>
          </div>
        </div>

        <span className="px-3 py-1 bg-indigo-900/30 text-indigo-300 border border-indigo-800/40 rounded-full text-xs font-semibold">
          {user.role.replace('_', ' ')}
        </span>
      </div>

      {/* Multi-Business Context Switcher */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-indigo-400" />
            <h2 className="text-sm font-bold text-white">Active Business Context</h2>
          </div>
          <span className="text-[11px] text-slate-400">
            {user.memberships?.length || 1} business membership(s)
          </span>
        </div>

        {switchError && (
          <div className="p-3 bg-red-900/20 border border-red-800/40 text-red-300 rounded-xl text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{switchError}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          {user.memberships && user.memberships.length > 0 ? (
            user.memberships.map((mem) => {
              const isActive = mem.businessId === user.businessId;
              return (
                <div
                  key={mem.id}
                  onClick={() => handleSwitchBusiness(mem.businessId)}
                  className={`p-3.5 rounded-xl border transition cursor-pointer flex items-center justify-between ${
                    isActive
                      ? 'bg-indigo-950/40 border-indigo-500/40 text-white'
                      : 'bg-slate-950/50 border-slate-800 hover:border-slate-700 text-slate-300'
                  }`}
                >
                  <div className="space-y-0.5">
                    <p className="font-semibold text-xs text-white">{mem.businessName}</p>
                    <p className="text-[11px] text-slate-400">
                      Role: <span className="text-indigo-300 font-medium">{mem.role.replace('_', ' ')}</span>
                    </p>
                  </div>
                  {isActive ? (
                    <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-950/60 px-2.5 py-1 rounded-lg border border-emerald-800/40">
                      <Check className="w-3 h-3" />
                      Active
                    </span>
                  ) : (
                    <button
                      disabled={switchLoading}
                      className="text-[11px] font-medium text-slate-400 hover:text-white bg-slate-800 px-2 py-1 rounded-lg transition"
                    >
                      Switch
                    </button>
                  )}
                </div>
              );
            })
          ) : (
            <div className="p-3.5 rounded-xl border border-indigo-500/40 bg-indigo-950/40 text-white flex items-center justify-between">
              <div>
                <p className="font-semibold text-xs text-white">{user.businessName}</p>
                <p className="text-[11px] text-indigo-300">Default Sandbox Business</p>
              </div>
              <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-950/60 px-2.5 py-1 rounded-lg border border-emerald-800/40">
                Active
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Profile Details Form */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <User className="w-4 h-4 text-indigo-400" />
            <h2 className="text-sm font-bold text-white">Contact & Identity</h2>
          </div>

          {profileError && (
            <div className="p-3 bg-red-900/20 border border-red-800/40 text-red-300 rounded-xl text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{profileError}</span>
            </div>
          )}

          {profileSuccess && (
            <div className="p-3 bg-emerald-900/20 border border-emerald-800/40 text-emerald-300 rounded-xl text-xs flex items-center gap-2">
              <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>Profile updated successfully!</span>
            </div>
          )}

          <form onSubmit={handleProfileSubmit} className="space-y-3.5 text-xs">
            <div>
              <label className="block text-slate-400 font-medium mb-1">Full Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-indigo-500 transition"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-medium mb-1">Email Address</label>
              <div className="relative">
                <input
                  type="email"
                  disabled
                  value={user.email}
                  className="w-full bg-slate-950/50 border border-slate-800/60 rounded-xl px-3 py-2 text-slate-400 cursor-not-allowed opacity-80"
                />
                <span className="absolute right-2.5 top-2.5 text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded">
                  Primary ID
                </span>
              </div>
            </div>

            <div>
              <label className="block text-slate-400 font-medium mb-1">Phone Number (E.164)</label>
              <div className="flex gap-2">
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-indigo-500 transition"
                />
                {user.phoneVerified ? (
                  <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-900/30 text-emerald-300 border border-emerald-800/40 rounded-xl text-[11px] font-semibold shrink-0">
                    <CheckCircle className="w-3.5 h-3.5" />
                    Verified
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsPhoneModalOpen(true)}
                    className="px-3 py-1.5 bg-amber-600/30 text-amber-300 hover:bg-amber-600/40 border border-amber-600/40 rounded-xl text-[11px] font-semibold shrink-0 transition cursor-pointer"
                  >
                    Verify SMS
                  </button>
                )}
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={profileSaving}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl disabled:opacity-50 flex items-center justify-center gap-2 transition cursor-pointer"
              >
                {profileSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
                Save Contact Information
              </button>
            </div>
          </form>
        </div>

        {/* Change Password Form */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <Lock className="w-4 h-4 text-indigo-400" />
            <h2 className="text-sm font-bold text-white">Security & Password</h2>
          </div>

          {passwordError && (
            <div className="p-3 bg-red-900/20 border border-red-800/40 text-red-300 rounded-xl text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{passwordError}</span>
            </div>
          )}

          {passwordSuccess && (
            <div className="p-3 bg-emerald-900/20 border border-emerald-800/40 text-emerald-300 rounded-xl text-xs flex items-center gap-2">
              <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>Password updated successfully!</span>
            </div>
          )}

          <form onSubmit={handlePasswordSubmit} className="space-y-3.5 text-xs">
            <div>
              <label className="block text-slate-400 font-medium mb-1">Current Password *</label>
              <div className="relative">
                <input
                  type={showCurrentPass ? 'text' : 'password'}
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 pr-9 text-slate-100 focus:outline-none focus:border-indigo-500 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPass(!showCurrentPass)}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-white"
                >
                  {showCurrentPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-slate-400 font-medium mb-1">New Password * (Min 8 chars)</label>
              <div className="relative">
                <input
                  type={showNewPass ? 'text' : 'password'}
                  required
                  minLength={8}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 pr-9 text-slate-100 focus:outline-none focus:border-indigo-500 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPass(!showNewPass)}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-white"
                >
                  {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-slate-400 font-medium mb-1">Confirm New Password *</label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-indigo-500 transition"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={passwordSaving}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-100 font-semibold border border-slate-700 rounded-xl disabled:opacity-50 flex items-center justify-center gap-2 transition cursor-pointer"
              >
                {passwordSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
                Update Password
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Session & Cryptographic Info */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-emerald-400" />
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">
            Active Session Security Primitives
          </h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl">
            <span className="text-slate-400 text-[11px] block">Token Strategy</span>
            <span className="font-semibold text-emerald-400 mt-0.5 block">HMAC SHA-256 Signed</span>
          </div>
          <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl">
            <span className="text-slate-400 text-[11px] block">Tenant Isolation</span>
            <span className="font-semibold text-indigo-400 mt-0.5 block">Strict Scoped Enclave</span>
          </div>
          <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl">
            <span className="text-slate-400 text-[11px] block">Correlation Header</span>
            <span className="font-semibold text-slate-200 mt-0.5 block font-mono text-[11px]">X-Correlation-ID</span>
          </div>
        </div>
      </div>

      {/* Phone Verification Modal */}
      <PhoneVerificationModal
        isOpen={isPhoneModalOpen}
        onClose={() => setIsPhoneModalOpen(false)}
        onSuccess={() => {
          setIsPhoneModalOpen(false);
          window.location.reload();
        }}
      />
    </div>
  );
}
