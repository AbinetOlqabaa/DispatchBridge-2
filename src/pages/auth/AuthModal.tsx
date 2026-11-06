import React, { useState } from 'react';
import {
  X,
  Eye,
  EyeOff,
  Lock,
  Mail,
  User as UserIcon,
  Phone,
  Building,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  ArrowRight,
  ShieldCheck,
  Smartphone,
  CreditCard,
  UserCheck,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';
import { useTranslation } from '../../context/LanguageContext.js';
import { UserRole } from '../../types/dispatch.js';
import { api } from '../../services/api.js';
import { SUPPORTED_COUNTRIES, normalizeToE164, isValidE164 } from '../../utils/phoneUtils.js';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'signin' | 'register' | 'forgot' | 'verifyPhone';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'signin',
}) => {
  const { login, register, verifyPhone, user, quickLoginDemoRole } = useAuth();
  const { t } = useTranslation();
  const [mode, setMode] = useState<'signin' | 'register' | 'forgot' | 'verifyPhone'>(initialMode);

  // Sign In state
  const [signInMode, setSignInMode] = useState<'MOBILE' | 'EMAIL'>('MOBILE');
  const [signInCountry, setSignInCountry] = useState(SUPPORTED_COUNTRIES[0]); // Ethiopia (+251)
  const [signInPhone, setSignInPhone] = useState('911019283');
  const [signInEmail, setSignInEmail] = useState('owner@apexsupply.com');
  const [signInPassword, setSignInPassword] = useState('Password123!');
  const [showSignInPassword, setShowSignInPassword] = useState(false);

  // Register state (Step 1 form)
  const [regStep, setRegStep] = useState<'FORM' | 'OTP'>('FORM');
  const [regName, setRegName] = useState('');
  const [regCountry, setRegCountry] = useState(SUPPORTED_COUNTRIES[0]);
  const [regPhone, setRegPhone] = useState('');
  const [regFan, setRegFan] = useState(''); // 16 numeric digits string
  const [regFin, setRegFin] = useState(''); // 12 numeric digits string
  const [regBusiness, setRegBusiness] = useState('');
  const [regRole, setRegRole] = useState<UserRole>('BUSINESS_OWNER');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [regConsent, setRegConsent] = useState(false);

  // Register OTP state (Step 2)
  const [regChallengeId, setRegChallengeId] = useState<string | null>(null);
  const [regOtpCode, setRegOtpCode] = useState('');
  const [regSimulatedCode, setRegSimulatedCode] = useState<string | null>(null);
  const [regMaskedPhone, setRegMaskedPhone] = useState('');
  const [regMaskedFan, setRegMaskedFan] = useState('');

  // Forgot password state (2-step Identity + OTP)
  const [forgotStep, setForgotStep] = useState<'IDENTITY' | 'OTP'>('IDENTITY');
  const [forgotCountry, setForgotCountry] = useState(SUPPORTED_COUNTRIES[0]);
  const [forgotPhone, setForgotPhone] = useState('');
  const [forgotFan, setForgotFan] = useState('');
  const [forgotFin, setForgotFin] = useState('');
  const [forgotChallengeId, setForgotChallengeId] = useState<string | null>(null);
  const [forgotOtpCode, setForgotOtpCode] = useState('');
  const [forgotSimulatedCode, setForgotSimulatedCode] = useState<string | null>(null);
  const [forgotMaskedPhone, setForgotMaskedPhone] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState('');

  // Legacy Phone verification state
  const [phoneCode, setPhoneCode] = useState('');

  // UI status
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  // Handle Sign In (Mobile default or Email)
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    setErrorMessage(null);
    setSuccessMessage(null);

    let identifier = '';
    if (signInMode === 'MOBILE') {
      if (!signInPhone.trim()) {
        setErrorMessage(t('auth.err_phone_req', 'Please enter your mobile phone number.'));
        return;
      }
      identifier = normalizeToE164(signInPhone, signInCountry.dialCode);
    } else {
      if (!signInEmail.trim() || !signInEmail.includes('@')) {
        setErrorMessage(t('auth.err_email_invalid', 'Please enter a valid work email address.'));
        return;
      }
      identifier = signInEmail.trim();
    }

    if (!signInPassword) {
      setErrorMessage(t('auth.err_pass_req', 'Please enter your account password.'));
      return;
    }

    setIsLoading(true);
    try {
      await login(identifier, signInPassword);
      setSuccessMessage(t('auth.msg_signin_success', 'Successfully signed in.'));
      setTimeout(() => {
        onClose();
      }, 500);
    } catch (err: any) {
      setErrorMessage(err.message || t('auth.err_invalid_creds', 'Invalid credentials. Please verify your details.'));
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Registration Step 1: Initiate with Fayda e-ID Verification
  const handleInitiateRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanFan = regFan.replace(/\D/g, '');
    const cleanFin = regFin.replace(/\D/g, '');
    const normPhone = normalizeToE164(regPhone, regCountry.dialCode);

    if (!regName.trim() || regName.trim().length < 2) {
      setErrorMessage(t('auth.err_name_req', 'Please provide your full legal name.'));
      return;
    }
    if (!isValidE164(normPhone)) {
      setErrorMessage(t('auth.err_phone_invalid', 'Please provide a valid mobile number in international standard format.'));
      return;
    }
    if (cleanFan.length !== 16) {
      setErrorMessage(t('auth.err_fan_invalid', 'FAN (Fayda Account Number) must be exactly 16 numeric digits.'));
      return;
    }
    if (cleanFin.length !== 12) {
      setErrorMessage(t('auth.err_fin_invalid', 'FIN (Fayda Identification Number) must be exactly 12 numeric digits.'));
      return;
    }
    if (regRole === 'SUPER_ADMIN') {
      setErrorMessage('Super Administrator enrollment cannot be initiated publicly.');
      return;
    }
    if (!regBusiness.trim()) {
      setErrorMessage('Company / Business Name is required.');
      return;
    }
    if (regPassword.length < 8) {
      setErrorMessage('Password must be at least 8 characters long.');
      return;
    }
    if (regPassword !== regConfirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }
    if (!regConsent) {
      setErrorMessage('Please accept the Fayda identity verification consent.');
      return;
    }

    setIsLoading(true);
    try {
      const challenge = await api.initiateRegistration({
        role: regRole,
        name: regName.trim(),
        phoneNumber: normPhone,
        countryDialCode: regCountry.dialCode,
        fan: cleanFan,
        fin: cleanFin,
        businessName: regBusiness.trim(),
        password: regPassword,
      });

      setRegChallengeId(challenge.challengeId);
      setRegMaskedPhone(challenge.maskedPhone);
      setRegMaskedFan(challenge.maskedFan);
      if (challenge.simulatedCode) {
        setRegSimulatedCode(challenge.simulatedCode);
        setRegOtpCode(challenge.simulatedCode);
      }
      setRegStep('OTP');
      setSuccessMessage('Fayda identity verified! Verification code dispatched to your mobile phone.');
    } catch (err: any) {
      setErrorMessage(err.message || 'Identity verification or registration initiation failed.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Registration Step 2: Complete with OTP
  const handleCompleteRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regChallengeId || !regOtpCode.trim() || isLoading) return;

    setErrorMessage(null);
    setIsLoading(true);
    try {
      await api.completeRegistration(regChallengeId, regOtpCode.trim());
      setSuccessMessage('Enrollment complete! Welcome to DispatchBridge.');
      setTimeout(() => {
        onClose();
        window.location.reload();
      }, 600);
    } catch (err: any) {
      setErrorMessage(err.message || 'OTP verification failed.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Forgot Password Step 1: Initiate
  const handleInitiateForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanFan = forgotFan.replace(/\D/g, '');
    const cleanFin = forgotFin.replace(/\D/g, '');
    const normPhone = normalizeToE164(forgotPhone, forgotCountry.dialCode);

    if (!forgotPhone.trim() || !isValidE164(normPhone)) {
      setErrorMessage('Please provide a valid registered mobile number.');
      return;
    }
    if (cleanFan.length !== 16) {
      setErrorMessage('FAN must be exactly 16 numeric digits.');
      return;
    }
    if (cleanFin.length !== 12) {
      setErrorMessage('FIN must be exactly 12 numeric digits.');
      return;
    }

    setIsLoading(true);
    try {
      const challenge = await api.initiateIdentityPasswordReset({
        phoneNumber: normPhone,
        fan: cleanFan,
        fin: cleanFin,
      });

      setForgotChallengeId(challenge.challengeId);
      setForgotMaskedPhone(challenge.maskedPhone);
      if (challenge.simulatedCode) {
        setForgotSimulatedCode(challenge.simulatedCode);
        setForgotOtpCode(challenge.simulatedCode);
      }
      setForgotStep('OTP');
      setSuccessMessage('Identity verified. An OTP code has been sent to your bound mobile phone.');
    } catch (err: any) {
      setErrorMessage(err.message || 'Identity verification failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Forgot Password Step 2: Complete
  const handleCompleteForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotChallengeId || !forgotOtpCode.trim() || isLoading) return;

    setErrorMessage(null);
    if (forgotNewPassword.length < 8) {
      setErrorMessage('New password must be at least 8 characters long.');
      return;
    }
    if (forgotNewPassword !== forgotConfirmPassword) {
      setErrorMessage('New passwords do not match.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await api.completeIdentityPasswordReset(
        forgotChallengeId,
        forgotOtpCode.trim(),
        forgotNewPassword
      );
      setSuccessMessage(res.message || 'Password reset successfully! You can now sign in.');
      setTimeout(() => {
        setMode('signin');
        setForgotStep('IDENTITY');
        setForgotChallengeId(null);
        setForgotOtpCode('');
        setForgotNewPassword('');
        setForgotConfirmPassword('');
      }, 1200);
    } catch (err: any) {
      setErrorMessage(err.message || 'Password recovery failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyPhoneLegacy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    setErrorMessage(null);
    setSuccessMessage(null);
    setIsLoading(true);

    try {
      await verifyPhone(phoneCode.trim());
      setSuccessMessage('Phone number verified successfully!');
      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err: any) {
      setErrorMessage(err.message || 'Verification failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickDemoRole = async (role: UserRole) => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      await quickLoginDemoRole(role);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Role switch failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 sm:p-8 my-auto text-slate-900 dark:text-slate-100 max-h-[92vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3.5 right-3.5 min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          aria-label={t('action.close')}
        >
          <X className="w-5 h-5" />
        </button>

        {/* Tab Headers */}
        {mode !== 'verifyPhone' && mode !== 'forgot' && (
          <div className="flex border-b border-slate-200 dark:border-slate-800 mb-6 pr-8">
            <button
              onClick={() => {
                setMode('signin');
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              className={`flex-1 min-h-[44px] pb-2 text-sm font-semibold border-b-2 text-center transition-colors cursor-pointer ${
                mode === 'signin'
                  ? 'border-indigo-600 dark:border-indigo-500 text-indigo-700 dark:text-indigo-400'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {t('auth.signin_tab')}
            </button>
            <button
              onClick={() => {
                setMode('register');
                setRegStep('FORM');
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              className={`flex-1 min-h-[44px] pb-2 text-sm font-semibold border-b-2 text-center transition-colors cursor-pointer ${
                mode === 'register'
                  ? 'border-indigo-600 dark:border-indigo-500 text-indigo-700 dark:text-indigo-400'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {t('auth.enroll_fayda')}
            </button>
          </div>
        )}

        {/* Feedback Alerts */}
        {errorMessage && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800/80 text-rose-800 dark:text-rose-300 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
            <div>{errorMessage}</div>
          </div>
        )}
        {successMessage && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/80 text-emerald-800 dark:text-emerald-300 text-xs flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
            <div>{successMessage}</div>
          </div>
        )}

        {/* SIGN IN FORM (Mobile Default) */}
        {mode === 'signin' && (
          <form onSubmit={handleSignIn} className="space-y-4">
            {/* Toggle between Mobile Number & Work Email */}
            <div className="flex rounded-xl bg-slate-100 dark:bg-slate-950 p-1 mb-2 border border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setSignInMode('MOBILE');
                  setErrorMessage(null);
                }}
                className={`flex-1 min-h-[40px] py-1.5 px-2.5 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition cursor-pointer ${
                  signInMode === 'MOBILE'
                    ? 'bg-indigo-600 text-white font-semibold shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>{t('auth.mode_mobile')}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setSignInMode('EMAIL');
                  setErrorMessage(null);
                }}
                className={`flex-1 min-h-[40px] py-1.5 px-2.5 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition cursor-pointer ${
                  signInMode === 'EMAIL'
                    ? 'bg-indigo-600 text-white font-semibold shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <Mail className="w-3.5 h-3.5" />
                <span>{t('auth.mode_email')}</span>
              </button>
            </div>

            {signInMode === 'MOBILE' ? (
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  {t('auth.mobile_phone')} <span className="text-rose-500 dark:text-rose-400">*</span>
                </label>
                <div className="flex gap-2">
                  <select
                    aria-label={t('auth.country_dial_code', 'Country dial code')}
                    value={signInCountry.code}
                    onChange={(e) => {
                      const found = SUPPORTED_COUNTRIES.find((c) => c.code === e.target.value);
                      if (found) setSignInCountry(found);
                    }}
                    className="min-h-[44px] bg-slate-50 dark:bg-slate-950/80 border border-slate-300 dark:border-slate-700 rounded-xl px-2.5 py-2.5 text-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer shrink-0"
                  >
                    {SUPPORTED_COUNTRIES.map((c) => (
                      <option key={c.code} value={c.code} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                        {c.flag} {c.dialCode}
                      </option>
                    ))}
                  </select>

                  <div className="relative flex-1">
                    <Smartphone className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-3.5" />
                    <input
                      type="tel"
                      required
                      value={signInPhone}
                      onChange={(e) => setSignInPhone(e.target.value)}
                      placeholder={signInCountry.samplePlaceholder}
                      className="w-full min-h-[44px] bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 mt-1 font-mono tabular-nums">
                  E.164: {normalizeToE164(signInPhone, signInCountry.dialCode) || '—'}
                </p>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">{t('auth.email_address')}</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-3.5" />
                  <input
                    type="email"
                    required
                    value={signInEmail}
                    onChange={(e) => setSignInEmail(e.target.value)}
                    placeholder={t('auth.placeholder_email', 'name@company.com')}
                    className="w-full min-h-[44px] bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">{t('auth.password')}</label>
                <button
                  type="button"
                  onClick={() => {
                    setMode('forgot');
                    setForgotStep('IDENTITY');
                    setErrorMessage(null);
                    setSuccessMessage(null);
                  }}
                  className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 font-medium cursor-pointer"
                >
                  {t('auth.forgot_password')}
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-3.5" />
                <input
                  type={showSignInPassword ? 'text' : 'password'}
                  required
                  value={signInPassword}
                  onChange={(e) => setSignInPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full min-h-[44px] bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl pl-9 pr-11 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="button"
                  onClick={() => setShowSignInPassword(!showSignInPassword)}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 min-w-[40px] min-h-[40px] flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-lg cursor-pointer"
                  aria-label={showSignInPassword ? 'Hide password' : 'Show password'}
                >
                  {showSignInPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full min-h-[44px] py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:text-slate-500 dark:disabled:text-slate-400 text-white text-sm font-semibold rounded-xl shadow-lg shadow-indigo-600/25 dark:shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
            >
              {isLoading ? (
                <span>{t('auth.submitting')}</span>
              ) : (
                <>
                  <span>{t('auth.signin_tab')}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            {/* Quick pre-fill for sandbox test accounts */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
              <span className="text-[11px] font-medium text-slate-600 dark:text-slate-400 block mb-2">{t('auth.quick_roles_label')}</span>
              <div className="grid grid-cols-2 gap-1.5 text-xs">
                <button
                  type="button"
                  onClick={() => handleQuickDemoRole('BUSINESS_OWNER')}
                  className="min-h-[44px] text-left px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/80 hover:bg-emerald-50 dark:hover:bg-slate-700 text-emerald-700 dark:text-emerald-300 border border-slate-200 dark:border-slate-700 font-medium cursor-pointer transition-colors"
                >
                  {t('role.business_owner')}
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickDemoRole('SENDER')}
                  className="min-h-[44px] text-left px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/80 hover:bg-blue-50 dark:hover:bg-slate-700 text-blue-700 dark:text-blue-300 border border-slate-200 dark:border-slate-700 font-medium cursor-pointer transition-colors"
                >
                  {t('role.sender')}
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickDemoRole('RECEIVER')}
                  className="min-h-[44px] text-left px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/80 hover:bg-amber-50 dark:hover:bg-slate-700 text-amber-800 dark:text-amber-300 border border-slate-200 dark:border-slate-700 font-medium cursor-pointer transition-colors"
                >
                  {t('role.receiver')}
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickDemoRole('SUPER_ADMIN')}
                  className="min-h-[44px] text-left px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/80 hover:bg-purple-50 dark:hover:bg-slate-700 text-purple-700 dark:text-purple-300 border border-slate-200 dark:border-slate-700 font-medium cursor-pointer transition-colors"
                >
                  {t('role.super_admin')}
                </button>
              </div>
            </div>
          </form>
        )}

        {/* REGISTRATION WITH FAYDA E-ID */}
        {mode === 'register' && (
          <>
            {/* Simulation label badge */}
            <div className="mb-4 p-2.5 rounded-xl bg-sky-50 dark:bg-sky-950/70 border border-sky-200 dark:border-sky-800/70 text-sky-800 dark:text-sky-300 text-xs flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" />
              <span>{t('auth.fayda_sim_banner', 'Fayda e-ID Gateway Simulator Active (Dev Mode)')}</span>
            </div>

            {regStep === 'FORM' ? (
              <form onSubmit={handleInitiateRegister} className="space-y-3">
                {/* Full Legal Name */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {t('auth.full_name')} <span className="text-rose-500 dark:text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <UserIcon className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-3" />
                    <input
                      type="text"
                      required
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      placeholder={t('auth.placeholder_full_name', 'e.g. Abebe Bikila')}
                      className="w-full min-h-[42px] bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl pl-9 pr-3 py-2 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                {/* Mobile Phone */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {t('auth.mobile_phone')} <span className="text-rose-500 dark:text-rose-400">*</span>
                  </label>
                  <div className="flex gap-2">
                    <select
                      aria-label={t('auth.country_dial_code', 'Country dial code')}
                      value={regCountry.code}
                      onChange={(e) => {
                        const found = SUPPORTED_COUNTRIES.find((c) => c.code === e.target.value);
                        if (found) setRegCountry(found);
                      }}
                      className="min-h-[42px] bg-slate-50 dark:bg-slate-950/80 border border-slate-300 dark:border-slate-700 rounded-xl px-2 py-2 text-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer shrink-0"
                    >
                      {SUPPORTED_COUNTRIES.map((c) => (
                        <option key={c.code} value={c.code} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                          {c.flag} {c.dialCode}
                        </option>
                      ))}
                    </select>
                    <div className="relative flex-1">
                      <Smartphone className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-3" />
                      <input
                        type="tel"
                        required
                        value={regPhone}
                        onChange={(e) => setRegPhone(e.target.value)}
                        placeholder={regCountry.samplePlaceholder}
                        className="w-full min-h-[42px] bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl pl-9 pr-3 py-2 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>
                </div>

                {/* FAN & FIN */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      {t('auth.fayda_id')} <span className="text-rose-500 dark:text-rose-400">*</span>
                    </label>
                    <div className="relative">
                      <CreditCard className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400 absolute left-2.5 top-3" />
                      <input
                        type="text"
                        required
                        maxLength={16}
                        value={regFan}
                        onChange={(e) => setRegFan(e.target.value.replace(/\D/g, ''))}
                        placeholder={t('auth.placeholder_fan', '16 numeric digits')}
                        className="w-full min-h-[42px] bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl pl-8 pr-2 py-1.5 text-xs font-mono text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-sky-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      {t('auth.fin_number')} <span className="text-rose-500 dark:text-rose-400">*</span>
                    </label>
                    <div className="relative">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 absolute left-2.5 top-3" />
                      <input
                        type="text"
                        required
                        maxLength={12}
                        value={regFin}
                        onChange={(e) => setRegFin(e.target.value.replace(/\D/g, ''))}
                        placeholder={t('auth.placeholder_fin', '12 numeric digits')}
                        className="w-full min-h-[42px] bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl pl-8 pr-2 py-1.5 text-xs font-mono text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Operating Role (No Super-Admin) */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {t('auth.assigned_role')} <span className="text-rose-500 dark:text-rose-400">*</span>
                  </label>
                  <select
                    value={regRole}
                    onChange={(e) => setRegRole(e.target.value as UserRole)}
                    className="w-full min-h-[42px] bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    <option value="BUSINESS_OWNER">{t('role.business_owner')}</option>
                    <option value="SENDER">{t('role.sender')}</option>
                    <option value="RECEIVER">{t('role.receiver')}</option>
                  </select>
                </div>

                {/* Company Name */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {t('auth.business_name')} <span className="text-rose-500 dark:text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <Building className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-3" />
                    <input
                      type="text"
                      required
                      value={regBusiness}
                      onChange={(e) => setRegBusiness(e.target.value)}
                      placeholder={t('auth.placeholder_biz_name', 'e.g. Apex Supply Freight Ltd')}
                      className="w-full min-h-[42px] bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl pl-9 pr-3 py-2 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                {/* Password & Confirm */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">{t('auth.password')}</label>
                    <input
                      type={showRegPassword ? 'text' : 'password'}
                      required
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full min-h-[42px] bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-1.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">{t('auth.confirm_password')}</label>
                    <input
                      type="password"
                      required
                      value={regConfirmPassword}
                      onChange={(e) => setRegConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full min-h-[42px] bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-1.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                {/* Consent */}
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-400">
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={regConsent}
                      onChange={(e) => setRegConsent(e.target.checked)}
                      className="mt-0.5 rounded border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-indigo-600"
                    />
                    <span>
                      {t('auth.consent_terms')}
                    </span>
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={isLoading || !regConsent}
                  className="w-full min-h-[44px] py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:text-slate-500 dark:disabled:text-slate-400 text-white text-sm font-semibold rounded-xl shadow-lg shadow-indigo-600/25 dark:shadow-indigo-600/30 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  {isLoading ? t('auth.submitting') : t('auth.request_otp_challenge')}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            ) : (
              /* Registration Step 2: OTP Verification */
              <form onSubmit={handleCompleteRegister} className="space-y-4">
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">{t('auth.mobile_phone')}:</span>
                    <span className="font-mono text-slate-900 dark:text-white font-semibold tabular-nums">{regMaskedPhone}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">{t('auth.fayda_id')}:</span>
                    <span className="font-mono text-sky-700 dark:text-sky-300 font-semibold tabular-nums">{regMaskedFan}</span>
                  </div>
                  {regSimulatedCode && (
                    <div className="p-2 rounded bg-sky-50 dark:bg-sky-950/80 border border-sky-200 dark:border-sky-800/60 flex items-center justify-between">
                      <span className="text-[11px] text-sky-800 dark:text-sky-300">{t('auth.simulated_sms_code', { code: '' })}</span>
                      <span className="text-xs font-mono font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-700">
                        {regSimulatedCode}
                      </span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 text-center">
                    {t('auth.enter_otp')}
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={regOtpCode}
                    onChange={(e) => setRegOtpCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="123456"
                    className="w-full min-h-[44px] tracking-widest text-center text-xl font-mono bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setRegStep('FORM')}
                    className="flex-1 min-h-[44px] py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-300 text-xs font-semibold rounded-xl cursor-pointer"
                  >
                    {t('auth.back_to_form')}
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading || regOtpCode.length < 6}
                    className="flex-1 min-h-[44px] py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl cursor-pointer disabled:opacity-50"
                  >
                    {isLoading ? t('auth.submitting') : t('auth.complete_enrollment')}
                  </button>
                </div>
              </form>
            )}
          </>
        )}

        {/* FORGOT PASSWORD WITH FAYDA + OTP */}
        {mode === 'forgot' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2 pr-8">
              <KeyRound className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">{t('auth.forgot_password_btn')}</h3>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              {t('auth.enter_credentials_desc')}
            </p>

            {forgotStep === 'IDENTITY' ? (
              <form onSubmit={handleInitiateForgot} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {t('auth.mobile_phone')} <span className="text-rose-500 dark:text-rose-400">*</span>
                  </label>
                  <div className="flex gap-2">
                    <select
                      aria-label={t('auth.country_dial_code', 'Country dial code')}
                      value={forgotCountry.code}
                      onChange={(e) => {
                        const found = SUPPORTED_COUNTRIES.find((c) => c.code === e.target.value);
                        if (found) setForgotCountry(found);
                      }}
                      className="min-h-[42px] bg-slate-50 dark:bg-slate-950/80 border border-slate-300 dark:border-slate-700 rounded-xl px-2 py-2 text-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer shrink-0"
                    >
                      {SUPPORTED_COUNTRIES.map((c) => (
                        <option key={c.code} value={c.code} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                          {c.flag} {c.dialCode}
                        </option>
                      ))}
                    </select>
                    <input
                      type="tel"
                      required
                      value={forgotPhone}
                      onChange={(e) => setForgotPhone(e.target.value)}
                      placeholder={forgotCountry.samplePlaceholder}
                      className="flex-1 min-h-[42px] bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {t('auth.fayda_id')} <span className="text-rose-500 dark:text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={16}
                    value={forgotFan}
                    onChange={(e) => setForgotFan(e.target.value.replace(/\D/g, ''))}
                    placeholder={t('auth.placeholder_fan', '16 numeric digits')}
                    className="w-full min-h-[42px] bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {t('auth.fin_number')} <span className="text-rose-500 dark:text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={12}
                    value={forgotFin}
                    onChange={(e) => setForgotFin(e.target.value.replace(/\D/g, ''))}
                    placeholder={t('auth.placeholder_fin', '12 numeric digits')}
                    className="w-full min-h-[42px] bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full min-h-[44px] py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-xl transition cursor-pointer"
                >
                  {isLoading ? t('auth.submitting') : t('auth.request_otp_challenge')}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMode('signin');
                    setErrorMessage(null);
                    setSuccessMessage(null);
                  }}
                  className="w-full min-h-[40px] text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white underline block text-center mt-2 cursor-pointer"
                >
                  {t('auth.back_to_signin')}
                </button>
              </form>
            ) : (
              <form onSubmit={handleCompleteForgot} className="space-y-3">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">{t('auth.mobile_phone')}:</span>
                    <span className="font-mono font-semibold text-slate-900 dark:text-white tabular-nums">{forgotMaskedPhone}</span>
                  </div>
                  {forgotSimulatedCode && (
                    <div className="p-2 rounded bg-sky-50 dark:bg-sky-950/80 border border-sky-200 dark:border-sky-800/60 flex items-center justify-between">
                      <span className="text-[11px] text-sky-800 dark:text-sky-300">{t('auth.simulated_sms_code', { code: '' })}</span>
                      <span className="text-xs font-mono font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-700">
                        {forgotSimulatedCode}
                      </span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">{t('auth.enter_otp')}</label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={forgotOtpCode}
                    onChange={(e) => setForgotOtpCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="123456"
                    className="w-full min-h-[44px] tracking-widest text-center text-lg font-mono bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">{t('auth.new_password')}</label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={forgotNewPassword}
                    onChange={(e) => setForgotNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full min-h-[42px] bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">{t('auth.confirm_password')}</label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={forgotConfirmPassword}
                    onChange={(e) => setForgotConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full min-h-[42px] bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setForgotStep('IDENTITY')}
                    className="flex-1 min-h-[44px] py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-300 text-xs font-semibold rounded-xl cursor-pointer"
                  >
                    {t('auth.back_to_form')}
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading || forgotOtpCode.length < 6 || forgotNewPassword.length < 8}
                    className="flex-1 min-h-[44px] py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl cursor-pointer disabled:opacity-50"
                  >
                    {isLoading ? t('auth.submitting') : t('auth.complete_reset')}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* PHONE VERIFICATION MODAL / FORM */}
        {mode === 'verifyPhone' && (
          <form onSubmit={handleVerifyPhoneLegacy} className="space-y-4">
            <div className="flex items-center gap-2 mb-2 pr-8">
              <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">{t('auth.otp_verification')}</h3>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              {t('auth.enter_otp')}
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">{t('auth.enter_otp')}</label>
              <input
                type="text"
                required
                maxLength={6}
                value={phoneCode}
                onChange={(e) => setPhoneCode(e.target.value)}
                placeholder="123456"
                className="w-full min-h-[44px] tracking-widest text-center text-lg font-mono bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || phoneCode.length < 6}
              className="w-full min-h-[44px] py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:text-slate-500 dark:disabled:text-slate-400 text-white text-sm font-semibold rounded-xl transition-all cursor-pointer"
            >
              {isLoading ? t('auth.submitting') : t('auth.verify_complete')}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-full min-h-[40px] text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white underline block text-center mt-2 cursor-pointer"
            >
              {t('auth.skip_verification')}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
