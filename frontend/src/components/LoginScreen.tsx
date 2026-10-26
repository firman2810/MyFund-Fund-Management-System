import React, { useState } from 'react';
import { User, UserRole } from '../types';
import { api } from '../services/api';
import { TermsModal } from './TermsModal';
import { AlertCircle, Check, Eye, EyeOff } from 'lucide-react';
import { Logo } from './ui/Logo';
import { BTN_PRIMARY, INPUT, LABEL, LINK, NOTICE_ERROR } from './ui/styles';

interface LoginScreenProps {
  onLogin: (user: User) => Promise<void>;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Sign In Form State
  const [identifier, setIdentifier] = useState('officer.mof@mof.gov.my');
  const [password, setPassword] = useState('1234');
  const [activeRole, setActiveRole] = useState<UserRole>('ministry');

  // Sign Up Form State
  const [signupName, setSignupName] = useState('');
  const [signupId, setSignupId] = useState('');
  const [signupRole, setSignupRole] = useState<UserRole>('agency');
  const [signupOrg, setSignupOrg] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirmPassword, setSignupConfirmPassword] = useState('');

  // Quick Preset Selector for Demo
  const handleQuickPreset = (role: UserRole) => {
    setActiveRole(role);
    setErrorMessage('');
    if (role === 'ministry') {
      setIdentifier('officer.mof@mof.gov.my');
      setPassword('1234');
    } else if (role === 'agency') {
      setIdentifier('director.nadma@nadma.gov.my');
      setPassword('1234');
    } else if (role === 'auditor') {
      setIdentifier('auditor.federal@audit.gov.my');
      setPassword('1234');
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!identifier.trim()) {
      setErrorMessage('Please enter your NRIC or Official ID.');
      return;
    }
    if (!password.trim()) {
      setErrorMessage('Please enter your password.');
      return;
    }

    setIsLoading(true);
    try {
      await onLogin(await api.login({ identifier: identifier.trim(), password, role: activeRole }));
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Sign in failed.');
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!signupName.trim()) {
      setErrorMessage('Please enter your full legal name.');
      return;
    }
    if (!signupId.trim()) {
      setErrorMessage('Please enter your NRIC or Official ID.');
      return;
    }
    if (!signupOrg.trim()) {
      setErrorMessage('Please enter your official Organization or Department.');
      return;
    }
    if (signupPassword.length < 4) {
      setErrorMessage('Password must be at least 4 characters.');
      return;
    }
    if (signupPassword !== signupConfirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    try {
      const user = await api.register({
        id: signupId.trim(),
        name: signupName.trim(),
        role: signupRole,
        organization: signupOrg.trim(),
        password: signupPassword,
      });
      setSuccessMessage('Account registered successfully! Redirecting...');
      await onLogin(user);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Registration failed.');
      setSuccessMessage('');
      setIsLoading(false);
    }
  };

  const H1 = 'm-0 font-display font-normal text-[clamp(30px,4vw,44px)] leading-[1.1] tracking-[-0.01em]';
  const presets: { role: UserRole; label: string }[] = [
    { role: 'ministry', label: 'Ministry' },
    { role: 'agency', label: 'Agency/NGO' },
    { role: 'auditor', label: 'Auditor' },
  ];
  const switchMode = (mode: 'signin' | 'signup') => {
    setErrorMessage('');
    setSuccessMessage('');
    setAuthMode(mode);
  };

  return (
    <div className="min-h-screen bg-page flex items-center justify-center p-4 sm:p-6 text-ink">
      {/* Form-only card: 480px leaves ~416px of content, room for the two-column sign-up rows without stretching inputs */}
      <div className="max-w-[480px] w-full bg-surface border-[1.5px] border-ink flex flex-col animate-fade-in">
        {/* Ink top strip, same as the app's top bar */}
        <div className="bg-ink px-6 min-h-16 flex items-center">
          <Logo variant="dark" />
        </div>

        <div className="p-6 sm:p-8">
          {/* Sign In / Sign Up Form */}
          <div className="flex flex-col">
            {authMode === 'signin' ? (
              // SIGN IN MODE
              <div className="flex flex-col gap-5">
                <h1 className={`${H1} border-b-4 border-ink pb-4`}>Sign in to MyFund</h1>

                {errorMessage && (
                  <div role="alert" className={NOTICE_ERROR}>
                    <AlertCircle aria-hidden="true" className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                <form onSubmit={handleSignIn} className="flex flex-col gap-4">
                  <div>
                    <label htmlFor="login-id" className={LABEL}>NRIC OR OFFICIAL ID</label>
                    <input
                      id="login-id"
                      type="text"
                      required
                      placeholder="Enter your ID"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      disabled={isLoading}
                      className={INPUT}
                    />
                  </div>

                  <div>
                    <div className="flex items-end justify-between">
                      <label htmlFor="login-pw" className={LABEL}>PASSWORD</label>
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-pressed={showPassword}
                        className={`${LINK} min-h-9 flex items-center gap-1 text-xs`}
                      >
                        {showPassword ? (
                          <><EyeOff aria-hidden="true" className="w-3.5 h-3.5" /><span>Hide</span></>
                        ) : (
                          <><Eye aria-hidden="true" className="w-3.5 h-3.5" /><span>Show</span></>
                        )}
                      </button>
                    </div>
                    <input
                      id="login-pw"
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={isLoading}
                      className={INPUT}
                    />
                  </div>

                  {/* Quick Role Selection Preset for Demonstration */}
                  <fieldset className="m-0 p-0 border-0">
                    <legend className={LABEL}>SELECT ROLE (DEMO)</legend>
                    <div className="grid grid-cols-3 border border-ink">
                      {presets.map((p, i) => (
                        <button
                          key={p.role}
                          type="button"
                          onClick={() => handleQuickPreset(p.role)}
                          aria-pressed={activeRole === p.role}
                          className={`min-h-11 px-2 text-[13px] font-medium truncate cursor-pointer ${i > 0 ? 'border-l border-ink' : ''} ${
                            activeRole === p.role ? 'bg-ink text-white' : 'bg-surface text-ink hover:bg-page'
                          }`}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </fieldset>

                  <button type="submit" disabled={isLoading} className={`${BTN_PRIMARY} w-full mt-1`}>
                    {isLoading ? 'Signing in…' : 'Sign in →'}
                  </button>
                </form>
              </div>
            ) : (
              // SIGN UP MODE
              <div className="flex flex-col gap-4">
                <h1 className={`${H1} border-b-4 border-ink pb-4`}>Create an account</h1>

                {errorMessage && (
                  <div role="alert" className={NOTICE_ERROR}>
                    <AlertCircle aria-hidden="true" className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{errorMessage}</span>
                  </div>
                )}
                {successMessage && (
                  <div role="status" className="p-3 border-[1.5px] border-ink text-[13px] flex items-center gap-2">
                    <Check aria-hidden="true" size={14} strokeWidth={3} className="shrink-0" />
                    <span>{successMessage}</span>
                  </div>
                )}

                <form onSubmit={handleSignUp} className="flex flex-col gap-3">
                  <div>
                    <label htmlFor="su-name" className={LABEL}>FULL NAME</label>
                    <input
                      id="su-name"
                      type="text"
                      required
                      placeholder="e.g. Dr. Norazlina binti Mansor"
                      value={signupName}
                      onChange={(e) => setSignupName(e.target.value)}
                      disabled={isLoading}
                      className={INPUT}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="su-id" className={LABEL}>NRIC / OFFICIAL ID</label>
                      <input
                        id="su-id"
                        type="text"
                        required
                        placeholder="e.g. 880412-10-5432"
                        value={signupId}
                        onChange={(e) => setSignupId(e.target.value)}
                        disabled={isLoading}
                        className={`${INPUT} font-mono`}
                      />
                    </div>

                    <div>
                      <label htmlFor="su-role" className={LABEL}>ROLE</label>
                      <select
                        id="su-role"
                        value={signupRole}
                        onChange={(e) => setSignupRole(e.target.value as UserRole)}
                        disabled={isLoading}
                        className={INPUT}
                      >
                        <option value="ministry">Ministry (Finance)</option>
                        <option value="agency">Agency / NGO</option>
                        <option value="auditor">Federal Auditor</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="su-org" className={LABEL}>ORGANIZATION / ENTITY</label>
                    <input
                      id="su-org"
                      type="text"
                      required
                      placeholder="e.g. National Disaster Management Agency"
                      value={signupOrg}
                      onChange={(e) => setSignupOrg(e.target.value)}
                      disabled={isLoading}
                      className={INPUT}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="su-pw" className={LABEL}>PASSWORD</label>
                      <input
                        id="su-pw"
                        type="password"
                        required
                        placeholder="••••••••"
                        value={signupPassword}
                        onChange={(e) => setSignupPassword(e.target.value)}
                        disabled={isLoading}
                        className={INPUT}
                      />
                    </div>

                    <div>
                      <label htmlFor="su-pw2" className={LABEL}>CONFIRM</label>
                      <input
                        id="su-pw2"
                        type="password"
                        required
                        placeholder="••••••••"
                        value={signupConfirmPassword}
                        onChange={(e) => setSignupConfirmPassword(e.target.value)}
                        disabled={isLoading}
                        className={INPUT}
                      />
                    </div>
                  </div>

                  <button type="submit" disabled={isLoading} className={`${BTN_PRIMARY} w-full mt-1`}>
                    {isLoading ? 'Registering…' : 'Sign up →'}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>

        {/* Bottom row: Sign In / Sign Up toggle and Terms */}
        <div className="px-6 sm:px-8 py-2 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-2 text-[13px] text-text-2">
          <span>
            {authMode === 'signin' ? 'Don’t have an account? ' : 'Already have an account? '}
            <button
              type="button"
              onClick={() => switchMode(authMode === 'signin' ? 'signup' : 'signin')}
              className={`${LINK} min-h-11`}
            >
              {authMode === 'signin' ? 'Sign up →' : 'Sign in →'}
            </button>
          </span>

          <button type="button" onClick={() => setShowTermsModal(true)} className={`${LINK} min-h-11`}>
            Terms &amp; conditions
          </button>
        </div>
      </div>

      {/* Terms & Conditions Modal */}
      <TermsModal
        isOpen={showTermsModal}
        onClose={() => setShowTermsModal(false)}
      />
    </div>
  );
};
