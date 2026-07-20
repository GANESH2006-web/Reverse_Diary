import React, { useState, useEffect } from 'react';
import { PenTool, BarChart3, ShieldAlert, LogOut, User, Sparkles, CheckCircle2, AlertCircle, KeyRound, X, Eye, EyeOff } from 'lucide-react';
import JournalTab from './components/JournalTab';
import InsightsTab from './components/InsightsTab';
import AdminTab from './components/AdminTab';
import AuthPage from './components/AuthPage';

export default function App() {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('journal');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Username onboarding state
  const [newUsername, setNewUsername] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [usernameLoading, setUsernameLoading] = useState(false);

  // Change Password Modal state
  const [showChangePassModal, setShowChangePassModal] = useState(false);
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [passError, setPassError] = useState('');
  const [passSuccess, setPassSuccess] = useState('');
  const [passLoading, setPassLoading] = useState(false);

  useEffect(() => {
    const savedToken = localStorage.getItem('diary_token');
    const savedUser = localStorage.getItem('diary_user');
    
    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));

      // Auto-sync user role and profile from backend
      const apiBase = import.meta.env.VITE_API_URL || '';
      fetch(`${apiBase}/api/auth/me`, {
        headers: { 'Authorization': `Bearer ${savedToken}` }
      })
      .then(res => res.ok ? res.json() : null)
      .then(freshUser => {
        if (freshUser) {
          setUser(freshUser);
          localStorage.setItem('diary_user', JSON.stringify(freshUser));
        }
      })
      .catch(err => console.error("Session sync error:", err));
    }
  }, []);

  const handleLoginSuccess = (newToken, newUser) => {
    setToken(newToken);
    setUser(newUser);
    setActiveTab('journal');
  };

  const handleLogout = () => {
    localStorage.removeItem('diary_token');
    localStorage.removeItem('diary_user');
    setToken(null);
    setUser(null);
    setActiveTab('journal');
    setNewUsername('');
    setUsernameError('');
    setShowChangePassModal(false);
  };

  const handleUsernameSubmit = async (e) => {
    e.preventDefault();
    if (!newUsername.trim()) {
      setUsernameError('Username cannot be empty.');
      return;
    }

    setUsernameError('');
    setUsernameLoading(true);

    const token = localStorage.getItem('diary_token');
    const apiBase = import.meta.env.VITE_API_URL || '';

    try {
      const response = await fetch(`${apiBase}/api/users/username`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ username: newUsername.trim() })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update username.');
      }

      // Update local storage and component state
      localStorage.setItem('diary_user', JSON.stringify(data));
      setUser(data);
    } catch (err) {
      console.error(err);
      setUsernameError(err.message);
    } finally {
      setUsernameLoading(false);
    }
  };

  const handleEntrySaved = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const handleChangePasswordSubmit = async (e) => {
    e.preventDefault();
    if (!currentPass || !newPass) {
      setPassError('Both current and new passwords are required.');
      return;
    }
    if (newPass.length < 6) {
      setPassError('New password must be at least 6 characters long.');
      return;
    }

    setPassError('');
    setPassSuccess('');
    setPassLoading(true);

    const token = localStorage.getItem('diary_token');
    const apiBase = import.meta.env.VITE_API_URL || '';

    try {
      const res = await fetch(`${apiBase}/api/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ currentPassword: currentPass, newPassword: newPass })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to change password.');

      setPassSuccess(data.message);
      setCurrentPass('');
      setNewPass('');
      setTimeout(() => setShowChangePassModal(false), 2000);
    } catch (err) {
      setPassError(err.message);
    } finally {
      setPassLoading(false);
    }
  };

  // If the user is not authenticated, render the login/register screen
  if (!token) {
    return <AuthPage onLoginSuccess={handleLoginSuccess} />;
  }

  // ONBOARDING SCREEN: If authenticated but username is not configured yet
  if (user && !user.username) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-[#0B0F19]">
        <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full glow-bg-primary pointer-events-none z-0"></div>
        <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] rounded-full glow-bg-secondary pointer-events-none z-0"></div>

        <div className="relative z-10 w-full max-w-md glass-panel rounded-3xl p-8 sm:p-10 shadow-glass border border-white/5 space-y-6">
          <div className="text-center space-y-3">
            <div className="inline-flex items-center space-x-2 text-primary bg-primary/10 border border-primary/20 px-3.5 py-1.5 rounded-full">
              <Sparkles className="w-4 h-4 text-primary animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-widest">Profile Setup</span>
            </div>
            <h2 className="text-2xl font-bold text-slate-100 leading-snug">Welcome to Reverse Diary!</h2>
            <p className="text-xs text-slate-400">
              Please choose a username to personalize your dashboard.
            </p>
          </div>

          <form onSubmit={handleUsernameSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Username</label>
              <input
                type="text"
                className="w-full px-4 py-3 bg-slate-900/60 border border-white/10 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-300"
                placeholder="e.g. mindfulness_master"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                disabled={usernameLoading}
              />
            </div>

            {usernameError && (
              <div className="flex items-start space-x-2 p-3 bg-accent-rose/10 border border-accent-rose/25 rounded-xl text-accent-rose text-xs">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{usernameError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={usernameLoading || !newUsername.trim()}
              className="w-full flex items-center justify-center space-x-2 py-3 bg-gradient-to-r from-primary to-accent-violet hover:from-primary-dark hover:to-primary text-white font-semibold rounded-xl shadow-glow-primary transition-all duration-300 disabled:opacity-40"
            >
              <span>Complete Setup</span>
              <CheckCircle2 className="w-4 h-4" />
            </button>
          </form>

          <div className="text-center pt-2">
            <button
              onClick={handleLogout}
              className="text-xs text-slate-500 hover:text-slate-300 underline"
            >
              Cancel and Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0B0F19] text-slate-100 pb-20">
      {/* Dynamic Background Glow Blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full glow-bg-primary pointer-events-none z-0"></div>
      <div className="absolute bottom-[10%] right-[-10%] w-[50%] h-[50%] rounded-full glow-bg-secondary pointer-events-none z-0"></div>

      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        
        {/* User Session Profile Bar */}
        <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-8">
          <div className="flex items-center space-x-2.5 bg-slate-900/40 border border-white/5 px-4 py-2 rounded-xl">
            <User className="w-4 h-4 text-primary" />
            <div className="text-left text-xs font-semibold text-slate-300">
              Logged in as <span className="text-primary font-bold">{user?.username}</span>
              {user?.role === 'admin' && (
                <span className="ml-2 px-2 py-0.5 text-[9px] font-bold text-accent-rose bg-accent-rose/10 border border-accent-rose/25 rounded-full uppercase">
                  Master Admin
                </span>
              )}
              {user?.role === 'subadmin' && (
                <span className="ml-2 px-2 py-0.5 text-[9px] font-bold text-accent-teal bg-accent-teal/10 border border-accent-teal/25 rounded-full uppercase">
                  Sub-Admin (Ruok)
                </span>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                setShowChangePassModal(true);
                setPassError('');
                setPassSuccess('');
                setCurrentPass('');
                setNewPass('');
              }}
              className="flex items-center space-x-1.5 text-xs text-slate-300 hover:text-primary-light transition bg-slate-900/60 hover:bg-primary/10 px-3.5 py-2 rounded-xl border border-white/5 hover:border-primary/20"
            >
              <KeyRound className="w-3.5 h-3.5 text-primary" />
              <span>Change Password</span>
            </button>

            <button
              onClick={handleLogout}
              className="flex items-center space-x-1.5 text-xs text-slate-400 hover:text-accent-rose transition bg-slate-950/20 hover:bg-accent-rose/10 px-3.5 py-2 rounded-xl border border-white/5 hover:border-accent-rose/20"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>

        {/* Header Section */}
        <header className="text-center mb-10 space-y-3">
          <div className="inline-flex items-center space-x-2 text-primary bg-primary/10 border border-primary/20 px-3.5 py-1.5 rounded-full">
            <Sparkles className="w-4 h-4 text-primary animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-widest">Mindfulness Shredder</span>
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-100 via-primary-light to-accent-teal">
            Reverse Diary
          </h1>
          <p className="text-sm sm:text-base text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Record brief sensory memories. Raw transcripts are shredded instantly on completion—keeping your mind clear, your data private, and leaving only clean AI-summarized takeaways.
          </p>
        </header>

        {/* Tab Switching Navigation */}
        <div className="flex justify-center mb-10">
          <div className="glass-panel p-1.5 rounded-xl flex items-center space-x-1 border border-white/5">
            <button
              onClick={() => setActiveTab('journal')}
              className={`flex items-center space-x-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300 ${
                activeTab === 'journal'
                  ? 'bg-primary text-white shadow-glow-primary'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              <PenTool className="w-4 h-4" />
              <span>Write Entry</span>
            </button>

            <button
              onClick={() => setActiveTab('insights')}
              className={`flex items-center space-x-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300 ${
                activeTab === 'insights'
                  ? 'bg-primary text-white shadow-glow-primary'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>Theme Insights</span>
            </button>

            {/* Render Admin/Sub-Admin Panel tab conditionally */}
            {(user?.role === 'admin' || user?.role === 'subadmin') && (
              <button
                onClick={() => setActiveTab('admin')}
                className={`flex items-center space-x-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300 ${
                  activeTab === 'admin'
                    ? 'bg-primary text-white shadow-glow-primary'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                }`}
              >
                <ShieldAlert className="w-4 h-4" />
                <span>{user?.role === 'subadmin' ? 'Sub-Admin Panel' : 'Admin Panel'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Tab Content Panels */}
        <main className="transition-all duration-300">
          {activeTab === 'journal' && <JournalTab onEntrySaved={handleEntrySaved} />}
          {activeTab === 'insights' && <InsightsTab refreshTrigger={refreshTrigger} />}
          {activeTab === 'admin' && (user?.role === 'admin' || user?.role === 'subadmin') && <AdminTab userRole={user?.role} />}
        </main>
      </div>

      {/* Change Password Modal */}
      {showChangePassModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-md glass-panel rounded-3xl p-6 sm:p-8 border border-white/10 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-white/5 pb-4">
              <div className="flex items-center space-x-2 text-primary font-bold text-lg">
                <KeyRound className="w-5 h-5" />
                <span>Change Password</span>
              </div>
              <button
                onClick={() => setShowChangePassModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleChangePasswordSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">Current Password</label>
                <div className="relative">
                  <input
                    type={showCurrentPass ? "text" : "password"}
                    className="w-full pl-4 pr-11 py-3 bg-slate-950/70 border border-white/15 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary/60 focus:border-primary transition"
                    placeholder="••••••••"
                    value={currentPass}
                    onChange={(e) => setCurrentPass(e.target.value)}
                    disabled={passLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPass(!showCurrentPass)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-accent-cyan hover:text-white transition p-1 focus:outline-none"
                    title={showCurrentPass ? "Hide password" : "Show password"}
                  >
                    {showCurrentPass ? (
                      <EyeOff className="w-4.5 h-4.5 text-accent-cyan stroke-[2.2]" />
                    ) : (
                      <Eye className="w-4.5 h-4.5 text-accent-cyan stroke-[2.2]" />
                    )}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">New Password</label>
                <div className="relative">
                  <input
                    type={showNewPass ? "text" : "password"}
                    className="w-full pl-4 pr-11 py-3 bg-slate-950/70 border border-white/15 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary/60 focus:border-primary transition"
                    placeholder="At least 6 characters"
                    value={newPass}
                    onChange={(e) => setNewPass(e.target.value)}
                    disabled={passLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPass(!showNewPass)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-accent-cyan hover:text-white transition p-1 focus:outline-none"
                    title={showNewPass ? "Hide password" : "Show password"}
                  >
                    {showNewPass ? (
                      <EyeOff className="w-4.5 h-4.5 text-accent-cyan stroke-[2.2]" />
                    ) : (
                      <Eye className="w-4.5 h-4.5 text-accent-cyan stroke-[2.2]" />
                    )}
                  </button>
                </div>
              </div>

              {passError && (
                <div className="flex items-start space-x-2 p-3 bg-accent-rose/10 border border-accent-rose/25 rounded-xl text-accent-rose text-xs">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{passError}</span>
                </div>
              )}

              {passSuccess && (
                <div className="flex items-start space-x-2 p-3 bg-accent-teal/10 border border-accent-teal/25 rounded-xl text-accent-teal text-xs">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{passSuccess}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={passLoading}
                className="w-full py-3.5 bg-gradient-to-r from-primary to-accent-violet hover:from-primary-dark hover:to-primary text-white font-semibold rounded-xl shadow-glow-primary transition active:scale-95 disabled:opacity-40"
              >
                <span>Update Password</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Footer Copyright */}
      <footer className="absolute bottom-6 left-0 right-0 text-center z-10">
        <p className="text-[11px] text-slate-500 font-medium">
          © {new Date().getFullYear()} Reverse Diary. All Rights Reserved.
        </p>
      </footer>
    </div>
  );
}
