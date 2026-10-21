import React, { useState } from 'react';
import {
  X,
  Lock,
  Mail,
  User,
  Phone,
  Building2,
  ShieldCheck,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  KeyRound,
  ShieldAlert,
} from 'lucide-react';
import { useAuth } from '../../services/authContext.tsx';
import { UserRole } from '../../types/index.ts';
import { validatePhoneNumber } from '../../utils/reconciliation.ts';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'login' | 'register' | 'forgot' | 'bootstrap' | 'verifyPhone';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  defaultTab = 'login',
}) => {
  const { login, register, bootstrapSuperAdmin, verifyPhone, currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'login' | 'register' | 'forgot' | 'bootstrap' | 'verifyPhone'>(
    defaultTab
  );

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [phone, setPhone] = useState('+14155550100');
  const [role, setRole] = useState<UserRole>('BUSINESS_OWNER');
  const [otpCode, setOtpCode] = useState('');
  const [bootstrapSecret, setBootstrapSecret] = useState('DISPATCH_BRIDGE_SETUP_TOKEN_2026');

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      await login(email, password);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Login failed. Check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please re-enter.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    const phoneCheck = validatePhoneNumber(phone);
    if (!phoneCheck.isValid) {
      setError(phoneCheck.error || 'Invalid phone number format.');
      return;
    }

    setIsLoading(true);
    try {
      await register({
        fullName,
        email,
        password,
        phone: phoneCheck.normalized,
        role,
        businessName: businessName || 'Global Trading Co',
      });
      setActiveTab('verifyPhone');
    } catch (err: any) {
      setError(err.message || 'Registration failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyPhone = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      await verifyPhone(otpCode.trim());
      setSuccessMessage('Phone verified successfully!');
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      setError(err.message || 'Invalid SMS verification code. Try test code: 123456');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBootstrapSuperAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (password.length < 10) {
      setError('Super Administrator password must be at least 10 characters.');
      return;
    }

    setIsLoading(true);
    try {
      await bootstrapSuperAdmin({
        bootstrapSecret: bootstrapSecret.trim(),
        email: email.trim(),
        fullName: fullName.trim() || 'First Super Administrator',
        password,
        phone: phone.trim(),
      });
      setSuccessMessage('Super Administrator ceremony completed successfully!');
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to complete super-admin provisioning ceremony.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden text-xs">
        {/* Header Tabs */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-indigo-400" />
            <h2 className="text-base font-bold text-white">
              {activeTab === 'login' && 'Sign In to DispatchBridge'}
              {activeTab === 'register' && 'Create Business Account'}
              {activeTab === 'forgot' && 'Reset Password'}
              {activeTab === 'verifyPhone' && 'Verify Phone Number'}
              {activeTab === 'bootstrap' && 'Super Administrator Bootstrap'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-slate-800 bg-slate-950/60 p-1 text-[11px]">
          <button
            onClick={() => {
              setActiveTab('login');
              setError(null);
            }}
            className={`flex-1 py-1.5 rounded-lg font-medium transition cursor-pointer ${
              activeTab === 'login' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => {
              setActiveTab('register');
              setError(null);
            }}
            className={`flex-1 py-1.5 rounded-lg font-medium transition cursor-pointer ${
              activeTab === 'register' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Register
          </button>
          <button
            onClick={() => {
              setActiveTab('bootstrap');
              setError(null);
            }}
            className={`flex-1 py-1.5 rounded-lg font-medium transition cursor-pointer ${
              activeTab === 'bootstrap' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            SuperAdmin Setup
          </button>
        </div>

        {/* Form Body */}
        <div className="p-5 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-200 flex items-center gap-2 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-200 flex items-center gap-2 text-xs">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* SIGN IN */}
          {activeTab === 'login' && (
            <form onSubmit={handleLogin} className="space-y-3">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. owner@dispatchbridge.internal"
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-xs focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-300 font-medium">Password</label>
                  <button
                    type="button"
                    onClick={() => setActiveTab('forgot')}
                    className="text-[11px] text-indigo-400 hover:underline cursor-pointer"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    className="w-full pl-9 pr-10 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-xs focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-200 cursor-pointer"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition disabled:opacity-50 cursor-pointer shadow-lg shadow-indigo-600/30"
                >
                  {isLoading ? 'Verifying...' : 'Sign In'}
                </button>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-800/60 border border-slate-700/60 text-[11px] text-slate-400">
                <span className="font-semibold text-slate-300">Quick Test Credentials:</span>
                <p className="mt-0.5">Email: <code className="text-indigo-300">owner@dispatchbridge.internal</code></p>
                <p>Password: <code className="text-indigo-300">any password</code> (demo store authenticated)</p>
              </div>
            </form>
          )}

          {/* REGISTER */}
          {activeTab === 'register' && (
            <form onSubmit={handleRegister} className="space-y-3">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Maria Sanchez"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Business Name</label>
                  <input
                    type="text"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="Logistics Corp"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Assign Role *</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as UserRole)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-xs cursor-pointer"
                  >
                    <option value="BUSINESS_OWNER">Business Owner</option>
                    <option value="SENDER">Sender (Dispatcher)</option>
                    <option value="RECEIVER">Receiver (Partner)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@business.com"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Phone Number (E.164 with country code) *</label>
                <input
                  type="text"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+14155550100"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Password *</label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min 8 chars"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Confirm Password *</label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat password"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-xs"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition disabled:opacity-50 cursor-pointer shadow-lg shadow-indigo-600/30"
                >
                  {isLoading ? 'Creating Account...' : 'Register Account'}
                </button>
              </div>
            </form>
          )}

          {/* PHONE VERIFICATION STEP */}
          {activeTab === 'verifyPhone' && (
            <form onSubmit={handleVerifyPhone} className="space-y-4">
              <div className="text-center space-y-1">
                <Phone className="w-8 h-8 mx-auto text-emerald-400" />
                <h3 className="text-sm font-bold text-white">Enter SMS Verification OTP</h3>
                <p className="text-slate-400 text-xs">
                  We sent a 6-digit verification code to your registered mobile phone.
                </p>
              </div>

              <div>
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  placeholder="123456"
                  className="w-full text-center tracking-widest text-lg font-mono px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-emerald-400 font-bold focus:ring-2 focus:ring-emerald-500"
                />
                <p className="text-center text-[11px] text-slate-500 mt-1">
                  Simulation code: <code className="text-emerald-300">123456</code>
                </p>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition disabled:opacity-50 cursor-pointer"
              >
                {isLoading ? 'Verifying...' : 'Confirm Phone Verification'}
              </button>
            </form>
          )}

          {/* SUPER ADMIN BOOTSTRAP CEREMONY */}
          {activeTab === 'bootstrap' && (
            <form onSubmit={handleBootstrapSuperAdmin} className="space-y-3">
              <div className="p-3 rounded-xl bg-purple-950/40 border border-purple-500/30 text-purple-200 text-xs space-y-1">
                <div className="flex items-center gap-1.5 font-bold">
                  <ShieldAlert className="w-4 h-4 text-purple-400" />
                  <span>Strict Server-Side One-Time Setup Ceremony</span>
                </div>
                <p className="text-[11px] opacity-90">
                  To prevent backdoors, there is zero hardcoded super-admin password. This form authorizes the initial super-admin using the one-time server token.
                </p>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Server Bootstrap Secret Key *</label>
                <input
                  type="text"
                  required
                  value={bootstrapSecret}
                  onChange={(e) => setBootstrapSecret(e.target.value)}
                  placeholder="DISPATCH_BRIDGE_SETUP_TOKEN_2026"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-purple-300 font-mono text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Super Admin Email *</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="root-admin@organization.gov"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Master Password *</label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min 10 characters"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Confirm Master *</label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat master"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-xs"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold transition disabled:opacity-50 cursor-pointer shadow-lg shadow-purple-600/30"
              >
                {isLoading ? 'Executing Setup Ceremony...' : 'Provision First Super Administrator'}
              </button>
            </form>
          )}

          {/* FORGOT PASSWORD */}
          {activeTab === 'forgot' && (
            <div className="space-y-4">
              <div className="text-center space-y-1">
                <KeyRound className="w-8 h-8 mx-auto text-indigo-400" />
                <h3 className="text-sm font-bold text-white">Reset Password</h3>
                <p className="text-slate-400 text-xs">
                  Enter your email to receive recovery instructions and reset link.
                </p>
              </div>

              <div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your registered email"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-xs"
                />
              </div>

              <button
                onClick={() => {
                  setSuccessMessage('Recovery instructions dispatched to your email.');
                  setTimeout(() => setActiveTab('login'), 2000);
                }}
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition cursor-pointer"
              >
                Send Reset Link
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
