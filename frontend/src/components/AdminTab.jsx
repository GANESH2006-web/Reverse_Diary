import React, { useState, useEffect, useMemo } from 'react';
import { Users, FileSpreadsheet, Activity, ShieldAlert, Calendar, UserCheck, BookOpen, Clock, ChevronDown, ChevronUp } from 'lucide-react';

export default function AdminTab({ userRole = 'admin' }) {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // State to track expanded/collapsed state of each user's feed
  const [expandedUsers, setExpandedUsers] = useState({});

  const fetchAdminData = async () => {
    setLoading(true);
    setError('');

    const token = localStorage.getItem('diary_token');
    const apiBase = import.meta.env.VITE_API_URL || '';

    try {
      // Fetch general stats
      const statsRes = await fetch(`${apiBase}/api/admin/stats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!statsRes.ok) throw new Error('Failed to fetch admin stats.');
      const statsData = await statsRes.json();
      setStats(statsData);

      // Fetch user list
      const usersRes = await fetch(`${apiBase}/api/admin/users`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!usersRes.ok) throw new Error('Failed to fetch user directory.');
      const usersData = await usersRes.json();
      setUsers(usersData);

      // Fetch everyone's entries
      const entriesRes = await fetch(`${apiBase}/api/admin/entries`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!entriesRes.ok) throw new Error('Failed to fetch global entries feed.');
      const entriesData = await entriesRes.json();
      setEntries(entriesData);

    } catch (err) {
      console.error(err);
      setError('Could not retrieve admin logs. Verify you have administrator access.');
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    const token = localStorage.getItem('diary_token');
    const apiBase = import.meta.env.VITE_API_URL || '';

    try {
      const res = await fetch(`${apiBase}/api/admin/users/${userId}/role`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ role: newRole })
      });
      if (!res.ok) throw new Error('Failed to update role');
      fetchAdminData();
    } catch (err) {
      alert('Role update failed: ' + err.message);
    }
  };

  const handleAdminResetUserPassword = async (userId, username) => {
    const newPass = prompt(`Enter new password for ${username || 'this user'}:`);
    if (!newPass) return;
    if (newPass.length < 6) {
      alert('Password must be at least 6 characters long.');
      return;
    }

    const token = localStorage.getItem('diary_token');
    const apiBase = import.meta.env.VITE_API_URL || '';

    try {
      const res = await fetch(`${apiBase}/api/admin/users/${userId}/password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ newPassword: newPass })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update password');
      alert(`Password for ${username || 'user'} successfully updated!`);
    } catch (err) {
      alert('Password reset failed: ' + err.message);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  // Group entries by user, sorted by their most recent activity date descending
  const groupedUsers = useMemo(() => {
    const groups = {};
    
    entries.forEach((entry) => {
      const userId = entry.user?._id || 'unknown';
      if (!groups[userId]) {
        groups[userId] = {
          userId,
          user: entry.user || { username: 'Unknown User', email: 'Unknown Email' },
          lastActive: new Date(entry.date),
          entriesList: []
        };
      }
      groups[userId].entriesList.push(entry);

      const entryDate = new Date(entry.date);
      if (entryDate > groups[userId].lastActive) {
        groups[userId].lastActive = entryDate;
      }
    });

    // Sort users by most recent activity (newest lastActive first)
    return Object.values(groups).sort((a, b) => b.lastActive - a.lastActive);
  }, [entries]);

  // Expand the most active user by default once the list loads
  useEffect(() => {
    if (groupedUsers.length > 0 && Object.keys(expandedUsers).length === 0) {
      setExpandedUsers({
        [groupedUsers[0].userId]: true
      });
    }
  }, [groupedUsers]);

  const toggleUserExpand = (userId) => {
    setExpandedUsers(prev => ({
      ...prev,
      [userId]: !prev[userId]
    }));
  };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatTime = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="w-full max-w-4xl mx-auto space-y-8 animate-pulse">
        {/* Stats widgets skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {[1, 2, 3].map(n => (
            <div key={n} className="glass-panel rounded-2xl p-6 h-28 bg-slate-800/20"></div>
          ))}
        </div>

        {/* User table skeleton */}
        <div className="glass-panel rounded-2xl p-6 space-y-4 h-64">
          <div className="h-6 w-40 bg-slate-800 rounded"></div>
          <div className="h-4 w-full bg-slate-800 rounded"></div>
          <div className="h-4 w-full bg-slate-800 rounded"></div>
          <div className="h-4 w-full bg-slate-800 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full max-w-xl mx-auto glass-panel rounded-2xl p-8 text-center space-y-4 border border-accent-rose/25">
        <ShieldAlert className="w-12 h-12 text-accent-rose mx-auto" />
        <h3 className="text-lg font-semibold text-slate-200">Authentication Failed</h3>
        <p className="text-sm text-slate-400">{error}</p>
        <button
          onClick={fetchAdminData}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg transition"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8">
      {/* Role Banner Header */}
      <div className="flex items-center justify-between glass-panel rounded-2xl p-5 border border-white/5">
        <div className="flex items-center space-x-3">
          <ShieldAlert className={`w-6 h-6 ${userRole === 'subadmin' ? 'text-accent-teal' : 'text-accent-rose'}`} />
          <div>
            <h2 className="text-base font-bold text-slate-100">
              {userRole === 'subadmin' ? 'Sub-Admin Console (Ruok)' : 'Master Administrator Console'}
            </h2>
            <p className="text-xs text-slate-400">
              {userRole === 'subadmin' 
                ? 'Authorized access for monitoring regular user activities and summaries.' 
                : 'Full system management, user role controls, and global logs.'}
            </p>
          </div>
        </div>
        <span className={`px-3 py-1 text-xs font-bold rounded-full uppercase border ${
          userRole === 'subadmin' 
            ? 'text-accent-teal bg-accent-teal/10 border-accent-teal/20' 
            : 'text-accent-rose bg-accent-rose/10 border-accent-rose/20'
        }`}>
          {userRole === 'subadmin' ? 'Sub-Admin Mode' : 'Master Admin Mode'}
        </span>
      </div>

      {/* 1. Stats Dashboard Widgets */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="glass-panel rounded-2xl p-6 flex items-center space-x-4 shadow-glass transition-all duration-300 hover:border-primary/20">
          <div className="p-3 bg-primary/10 text-primary rounded-xl border border-primary/20">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
              {userRole === 'subadmin' ? 'Managed Users' : 'Total Users'}
            </span>
            <span className="text-2xl font-bold text-slate-100">{stats?.totalUsers || 0}</span>
          </div>
        </div>

        <div className="glass-panel rounded-2xl p-6 flex items-center space-x-4 shadow-glass transition-all duration-300 hover:border-accent-teal/20">
          <div className="p-3 bg-accent-teal/10 text-accent-teal rounded-xl border border-accent-teal/20">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <div>
            <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">User Summaries</span>
            <span className="text-2xl font-bold text-slate-100">{stats?.totalEntries || 0}</span>
          </div>
        </div>

        <div className="glass-panel rounded-2xl p-6 flex items-center space-x-4 shadow-glass transition-all duration-300 hover:border-accent-violet/20">
          <div className="p-3 bg-accent-violet/10 text-accent-violet rounded-xl border border-accent-violet/20">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Avg Logs / User</span>
            <span className="text-2xl font-bold text-slate-100">{stats?.averageEntriesPerUser || 0}</span>
          </div>
        </div>
      </div>

      {/* 2. User Directory Table */}
      <div className="glass-panel rounded-2xl shadow-glass border border-white/5 overflow-hidden">
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <UserCheck className="w-5 h-5 text-primary" />
            <h3 className="font-bold text-slate-200">Registered Users Directory</h3>
          </div>
          <button 
            onClick={fetchAdminData}
            className="text-xs text-primary hover:text-primary-light font-semibold hover:underline"
          >
            Refresh Directory
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="text-xs uppercase tracking-wider bg-slate-900/60 text-slate-400 border-b border-white/5">
              <tr>
                <th className="py-4 px-6">Username</th>
                <th className="py-4 px-6">Role</th>
                <th className="py-4 px-6">Joined Date</th>
                <th className="py-4 px-6 text-center">Entries Logged</th>
                {userRole === 'admin' && <th className="py-4 px-6 text-right">Role Controls</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {users.map((u) => (
                <tr key={u._id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="py-4 px-6 font-semibold text-slate-200">{u.username}</td>
                  <td className="py-4 px-6">
                    <span className={`px-2.5 py-0.5 text-[11px] font-semibold rounded-full uppercase border ${
                      u.role === 'admin' 
                        ? 'text-accent-rose bg-accent-rose/10 border-accent-rose/20'
                        : u.role === 'subadmin'
                        ? 'text-accent-teal bg-accent-teal/10 border-accent-teal/20' 
                        : 'text-slate-300 bg-slate-850/40 border-white/10'
                    }`}>
                      {u.role === 'subadmin' ? 'Sub-Admin (Ruok)' : u.role}
                    </span>
                  </td>
                  <td className="py-4 px-6 flex items-center space-x-1.5 text-slate-400">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{formatDate(u.createdAt)}</span>
                  </td>
                  <td className="py-4 px-6 text-center font-mono font-medium text-slate-200">
                    {u.entryCount}
                  </td>
                  {userRole === 'admin' && (
                    <td className="py-4 px-6 text-right space-x-2">
                      <select
                        value={u.role}
                        onChange={(e) => handleRoleChange(u._id, e.target.value)}
                        className="bg-slate-900 text-xs text-slate-200 border border-white/10 rounded-lg px-2.5 py-1 focus:outline-none focus:border-primary"
                      >
                        <option value="user">User</option>
                        <option value="subadmin">Sub-Admin (Ruok)</option>
                        <option value="admin">Master Admin</option>
                      </select>

                      <button
                        onClick={() => handleAdminResetUserPassword(u._id, u.username)}
                        className="px-2.5 py-1 text-xs bg-accent-violet/10 text-accent-violet border border-accent-violet/20 hover:bg-accent-violet/20 rounded-lg font-semibold transition"
                        title="Reset User Password"
                      >
                        Reset Pass
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. Grouped User Activity Logs */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <BookOpen className="w-5 h-5 text-accent-teal" />
            <h3 className="font-bold text-slate-200">User Activity Summaries (Grouped by Activity)</h3>
          </div>
          <span className="px-2.5 py-0.5 text-[10px] font-bold text-accent-teal bg-accent-teal/10 border border-accent-teal/20 rounded-full uppercase">
            Grouped by User
          </span>
        </div>

        {groupedUsers.length === 0 ? (
          <div className="glass-panel rounded-2xl p-8 text-center text-sm text-slate-400">
            No entries have been logged in the system yet.
          </div>
        ) : (
          groupedUsers.map((group) => {
            const isExpanded = !!expandedUsers[group.userId];
            return (
              <div 
                key={group.userId} 
                className={`glass-panel rounded-2xl border transition-all duration-300 overflow-hidden ${
                  isExpanded ? 'border-accent-teal/30 bg-slate-900/30' : 'border-white/5 bg-slate-950/20 hover:border-white/10'
                }`}
              >
                {/* User Header Accordion Toggle */}
                <button
                  onClick={() => toggleUserExpand(group.userId)}
                  className="w-full p-5 flex items-center justify-between text-left focus:outline-none"
                >
                  <div className="flex items-center space-x-3.5">
                    <div className="w-10 h-10 rounded-xl bg-[#1D283C] border border-white/5 flex items-center justify-center font-bold text-sm text-primary-light uppercase">
                      {group.user.username?.substring(0, 2) || "U"}
                    </div>
                    <div>
                      <span className="block text-sm font-bold text-slate-200">
                        {group.user.username || "(No username set)"}
                      </span>
                      <span className="block text-xs text-slate-400">
                        {group.user.email}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-6">
                    <div className="text-right text-xs text-slate-450 hidden sm:block">
                      <span className="block font-semibold">Active: {formatDate(group.lastActive)}</span>
                      <span className="block text-[11px] text-slate-500">at {formatTime(group.lastActive)}</span>
                    </div>
                    
                    <div className="flex items-center space-x-2 bg-slate-800/40 border border-white/5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-350">
                      <span>{group.entriesList.length} Summaries</span>
                    </div>

                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-slate-400" />
                    )}
                  </div>
                </button>

                {/* Collapsible Entries Feed */}
                {isExpanded && (
                  <div className="p-6 pt-0 border-t border-white/5 bg-slate-950/40 space-y-6 divide-y divide-white/5">
                    {group.entriesList.map((entry, idx) => (
                      <div key={entry._id} className={`space-y-3 ${idx === 0 ? 'pt-5' : 'pt-5'}`}>
                        <div className="flex items-center justify-between text-xs text-slate-400">
                          <div className="flex items-center space-x-1">
                            <Calendar className="w-3.5 h-3.5 text-slate-500" />
                            <span>{formatDate(entry.date)}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Clock className="w-3.5 h-3.5 text-slate-500" />
                            <span>{formatTime(entry.date)}</span>
                          </div>
                        </div>

                        <div className="bg-slate-900/50 border border-white/5 rounded-xl p-4.5 space-y-2.5">
                          <div className="text-xs">
                            <span className="font-semibold text-slate-500 uppercase tracking-wider block mb-1">Prompted Question:</span>
                            <p className="italic text-slate-350">"{entry.prompt}"</p>
                          </div>
                          <div className="text-sm">
                            <span className="font-semibold text-accent-teal uppercase tracking-wider text-xs block mb-1">Gemini Summarized Takeaway:</span>
                            <p className="text-slate-200 font-medium leading-relaxed">{entry.summaryEntry}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
