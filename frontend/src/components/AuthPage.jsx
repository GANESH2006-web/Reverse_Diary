import React, { useState } from 'react';
import { LogIn, UserPlus, KeyRound, Mail, AlertCircle, ShieldCheck, CornerDownLeft, ShieldAlert, ArrowLeft, Eye, EyeOff } from 'lucide-react';

export default function AuthPage({ onLoginSuccess }) {
  // Modes: 'login', 'register', 'forgot'
  const [mode, setMode] = useState('login');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);

  // Show/Hide password toggle states
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Unified Forgot password state
  const [forgotStep, setForgotStep] = useState(1); // 1 = enter email, 2 = set new password
  const [isAdminAccount, setIsAdminAccount] = useState(false);
  const [newPassword, setNewPassword] = useState('');

  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const resetMessages = () => {
    setError('');
    setSuccessMsg('');
  };

  const switchMode = (newMode) => {
    setMode(newMode);
    resetMessages();
    setOtpSent(false);
    setOtp('');
    setForgotStep(1);
    setIsAdminAccount(false);
    setNewPassword('');
    setShowPassword(false);
    setShowNewPassword(false);
  };

  // Send registration OTP
  const handleSendRegisterOtp = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Please enter your email address first.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address.');
      return;
    }

    resetMessages();
    setLoading(true);

    const apiBase = import.meta.env.VITE_API_URL || '';

    try {
      const response = await fetch(`${apiBase}/api/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to send verification code.');

      setOtpSent(true);
      setSuccessMsg('Verification OTP code sent! Check your email inbox.');
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Login / Register Submit
  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('Please fill in all required fields.');
      return;
    }

    if (mode === 'register' && !otp.trim()) {
      setError('Please enter the 6-digit verification code.');
      return;
    }

    resetMessages();
    setLoading(true);

    const apiBase = import.meta.env.VITE_API_URL || '';
    const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/register';
    const payload = mode === 'login' 
      ? { email: email.trim().toLowerCase(), password } 
      : { email: email.trim().toLowerCase(), password, otp: otp.trim() };

    try {
      const response = await fetch(`${apiBase}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Authentication failed.');

      localStorage.setItem('diary_token', data.token);
      localStorage.setItem('diary_user', JSON.stringify(data.user));

      onLoginSuccess(data.token, data.user);
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Check Email for Forgot Password (Auto-detects Admin vs User)
  const handleForgotCheckEmail = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Please enter your registered email address.');
      return;
    }

    resetMessages();
    setLoading(true);

    const apiBase = import.meta.env.VITE_API_URL || '';

    try {
      const response = await fetch(`${apiBase}/api/auth/forgot-password-check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to check email.');

      setIsAdminAccount(!!data.isAdmin);
      setForgotStep(2);
      setSuccessMsg(data.message);
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Submit Password Reset (Handles both Admin & User OTP reset)
  const handleResetPasswordSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !otp.trim() || !newPassword.trim()) {
      setError('Please enter your email, OTP verification code, and new password.');
      return;
    }

    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters long.');
      return;
    }

    resetMessages();
    setLoading(true);

    const apiBase = import.meta.env.VITE_API_URL || '';

    try {
      const response = await fetch(`${apiBase}/api/auth/reset-password-submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          otp: otp.trim(),
          newPassword: newPassword.trim()
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to reset password.');

      setSuccessMsg(data.message);
      setTimeout(() => switchMode('login'), 2000);
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-[#070A12]">
      {/* Dynamic Background Glow Blobs */}
      <div className="absolute top-[-20%] left-[-20%] w-[65%] h-[65%] rounded-full glow-bg-primary pointer-events-none z-0"></div>
      <div className="absolute bottom-[-20%] right-[-20%] w-[65%] h-[65%] rounded-full glow-bg-secondary pointer-events-none z-0"></div>

      <div 
        className={`relative z-10 w-full max-w-md glass-panel rounded-3xl p-8 sm:p-10 shadow-glass border transition-all duration-500 space-y-7 ${
          mode === 'login'
            ? 'border-primary/30 shadow-glow-primary bg-[#121828]/85' 
            : mode === 'register'
            ? 'border-accent-cyan/30 shadow-glow-teal bg-[#0B1A28]/85'
            : 'border-accent-violet/30 shadow-glow-primary bg-[#161226]/85'
        }`}
      >
        {/* Title branding header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-100 via-primary-light to-accent-cyan">
            Reverse Diary
          </h1>

          {mode === 'login' && (
            <>
              <h2 className="text-lg font-bold text-primary-light">Sign In to Your Account</h2>
              <p className="text-xs text-slate-400">Enter your credentials to access your private sensory database.</p>
            </>
          )}

          {mode === 'register' && (
            <>
              <h2 className="text-lg font-bold text-accent-cyan">Create a New Account</h2>
              <p className="text-xs text-slate-400">Verify your email with an OTP code to register your secure journal.</p>
            </>
          )}

          {mode === 'forgot' && (
            <>
              <h2 className="text-lg font-bold text-accent-violet">Account Recovery</h2>
              <p className="text-xs text-slate-400">
                {forgotStep === 1 
                  ? 'Enter your registered email address to recover your account.' 
                  : 'Enter the verification OTP code sent to your email and your new password.'}
              </p>
            </>
          )}
        </div>

        {/* 1. LOGIN & REGISTER FORM */}
        {(mode === 'login' || mode === 'register') && (
          <form onSubmit={mode === 'login' || otpSent ? handleAuthSubmit : handleSendRegisterOtp} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-light" />
                <input
                  type="email"
                  className="w-full pl-11 pr-4 py-3 bg-slate-950/70 border border-white/15 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary/60 focus:border-primary transition"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading || (otpSent && mode === 'register')}
                />
              </div>
            </div>

            {mode === 'register' && otpSent && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">Verification OTP Code</label>
                <div className="relative">
                  <ShieldCheck className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-accent-cyan" />
                  <input
                    type="text"
                    maxLength={6}
                    className="w-full pl-11 pr-4 py-3 bg-slate-950/70 border border-white/15 rounded-xl text-slate-100 placeholder-slate-500 tracking-widest font-mono text-lg focus:outline-none focus:ring-2 focus:ring-accent-cyan/60 focus:border-accent-cyan transition"
                    placeholder="------"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    disabled={loading}
                  />
                </div>
              </div>
            )}

            {(mode === 'login' || otpSent) && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">Password</label>
                  {mode === 'login' && (
                    <button
                      type="button"
                      onClick={() => switchMode('forgot')}
                      className="text-xs text-primary-light hover:text-white underline font-medium"
                    >
                      Forgot Password?
                    </button>
                  )}
                </div>

                <div className="relative">
                  <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-light" />
                  <input
                    type={showPassword ? "text" : "password"}
                    className="w-full pl-11 pr-11 py-3 bg-slate-950/70 border border-white/15 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary/60 focus:border-primary transition"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                  />
                  {/* High Visibility Show/Hide Password Toggle */}
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-accent-cyan hover:text-white transition p-1 focus:outline-none"
                    title={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4.5 h-4.5 text-accent-cyan stroke-[2.2]" />
                    ) : (
                      <Eye className="w-4.5 h-4.5 text-accent-cyan stroke-[2.2]" />
                    )}
                  </button>
                </div>
              </div>
            )}

            {error && (
              <div className="flex items-start space-x-2.5 p-3.5 bg-accent-rose/15 border border-accent-rose/30 rounded-xl text-accent-rose text-xs font-medium">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {successMsg && (
              <div className="flex items-start space-x-2.5 p-3.5 bg-accent-emerald/15 border border-accent-emerald/30 rounded-xl text-accent-emerald text-xs font-medium">
                <ShieldCheck className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{successMsg}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className={`w-full flex items-center justify-center space-x-2 py-3.5 text-white font-bold rounded-xl transition-all duration-300 active:scale-95 disabled:opacity-40 ${
                mode === 'login' 
                  ? 'bg-gradient-to-r from-primary to-accent-violet shadow-glow-primary hover:from-primary-dark hover:to-primary' 
                  : 'bg-gradient-to-r from-accent-cyan to-primary shadow-glow-teal hover:from-accent-cyan hover:to-primary'
              }`}
            >
              {mode === 'login' ? (
                <>
                  <span>Sign In</span>
                  <LogIn className="w-4.5 h-4.5" />
                </>
              ) : otpSent ? (
                <>
                  <span>Verify & Sign Up</span>
                  <UserPlus className="w-4.5 h-4.5" />
                </>
              ) : (
                <>
                  <span>Request Verification Code</span>
                  <CornerDownLeft className="w-4.5 h-4.5" />
                </>
              )}
            </button>
          </form>
        )}

        {/* 2. UNIFIED FORGOT PASSWORD FORM */}
        {mode === 'forgot' && (
          <form onSubmit={forgotStep === 1 ? handleForgotCheckEmail : handleResetPasswordSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">Registered Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-accent-violet" />
                <input
                  type="email"
                  className="w-full pl-11 pr-4 py-3 bg-slate-950/70 border border-white/15 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-accent-violet/60 focus:border-accent-violet transition"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading || forgotStep === 2}
                />
              </div>
            </div>

            {forgotStep === 2 && (
              <>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">OTP Reset Code</label>
                  <div className="relative">
                    <ShieldCheck className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-accent-cyan" />
                    <input
                      type="text"
                      maxLength={6}
                      className="w-full pl-11 pr-4 py-3 bg-slate-950/70 border border-white/15 rounded-xl text-slate-100 tracking-widest font-mono text-lg focus:outline-none focus:ring-2 focus:ring-accent-cyan/60 focus:border-accent-cyan transition"
                      placeholder="------"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                      disabled={loading}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">Create New Password</label>
                  <div className="relative">
                    <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-accent-violet" />
                    <input
                      type={showNewPassword ? "text" : "password"}
                      className="w-full pl-11 pr-11 py-3 bg-slate-950/70 border border-white/15 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-accent-violet/60 focus:border-accent-violet transition"
                      placeholder="At least 6 characters"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      disabled={loading}
                    />
                    {/* High Visibility Show/Hide Password Toggle */}
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-accent-cyan hover:text-white transition p-1 focus:outline-none"
                      title={showNewPassword ? "Hide password" : "Show password"}
                    >
                      {showNewPassword ? (
                        <EyeOff className="w-4.5 h-4.5 text-accent-cyan stroke-[2.2]" />
                      ) : (
                        <Eye className="w-4.5 h-4.5 text-accent-cyan stroke-[2.2]" />
                      )}
                    </button>
                  </div>
                </div>
              </>
            )}

            {error && (
              <div className="flex items-start space-x-2.5 p-3.5 bg-accent-rose/15 border border-accent-rose/30 rounded-xl text-accent-rose text-xs font-medium">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {successMsg && (
              <div className="flex items-start space-x-2.5 p-3.5 bg-accent-emerald/15 border border-accent-emerald/30 rounded-xl text-accent-emerald text-xs font-medium">
                <ShieldCheck className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{successMsg}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center space-x-2 py-3.5 bg-gradient-to-r from-accent-violet to-primary text-white font-bold rounded-xl transition shadow-glow-primary active:scale-95 disabled:opacity-40"
            >
              {forgotStep === 1 ? (
                <>
                  <span>Continue</span>
                  <CornerDownLeft className="w-4.5 h-4.5" />
                </>
              ) : (
                <>
                  <span>Reset Password Now</span>
                  <ShieldCheck className="w-4.5 h-4.5" />
                </>
              )}
            </button>
          </form>
        )}

        {/* Footer Navigation Links */}
        <div className="pt-2 text-center text-xs">
          {mode === 'login' ? (
            <button
              type="button"
              className="text-primary-light hover:text-white font-medium transition underline"
              onClick={() => switchMode('register')}
            >
              Don't have an account? Sign Up
            </button>
          ) : (
            <button
              type="button"
              className="text-slate-400 hover:text-white transition underline flex items-center justify-center space-x-1.5 mx-auto"
              onClick={() => switchMode('login')}
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Sign In</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
