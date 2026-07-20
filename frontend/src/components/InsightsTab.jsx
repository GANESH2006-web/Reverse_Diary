import React, { useState, useEffect } from 'react';
import { Sparkles, Calendar, MessageSquare, Compass, Activity, ShieldAlert, ChevronDown, ChevronRight } from 'lucide-react';

export default function InsightsTab({ refreshTrigger }) {
  const [insights, setInsights] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedMonths, setExpandedMonths] = useState({});

  const fetchInsightsAndHistory = async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('diary_token');
      const apiBase = import.meta.env.VITE_API_URL || '';
      
      // Fetch insights
      const insightsRes = await fetch(`${apiBase}/api/insights`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!insightsRes.ok) throw new Error('Failed to fetch insights data.');
      const insightsData = await insightsRes.json();
      setInsights(insightsData);

      // Fetch history
      const historyRes = await fetch(`${apiBase}/api/entries`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!historyRes.ok) throw new Error('Failed to fetch history logs.');
      const historyData = await historyRes.json();
      setHistory(historyData);

      // Automatically expand the most recent month by default
      if (historyData.length > 0) {
        const firstEntryDate = new Date(historyData[0].date);
        const firstMonthKey = firstEntryDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        setExpandedMonths({ [firstMonthKey]: true });
      }
    } catch (err) {
      console.error(err);
      setError('Could not retrieve insights. Check backend database and environment config.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInsightsAndHistory();
  }, [refreshTrigger]);

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Group entries by month and year
  const getGroupedEntries = () => {
    const groups = {};
    history.forEach((entry) => {
      const date = new Date(entry.date);
      const monthYearKey = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }); // e.g. "July 2026"
      if (!groups[monthYearKey]) {
        groups[monthYearKey] = [];
      }
      groups[monthYearKey].push(entry);
    });
    return groups;
  };

  const toggleMonthExpansion = (monthKey) => {
    setExpandedMonths(prev => ({
      ...prev,
      [monthKey]: !prev[monthKey]
    }));
  };

  if (loading) {
    return (
      <div className="w-full max-w-4xl mx-auto space-y-8 animate-pulse">
        <div className="glass-panel rounded-2xl p-6 space-y-3">
          <div className="h-4 w-32 bg-slate-800 rounded"></div>
          <div className="flex flex-wrap gap-2 pt-2">
            {[1, 2, 3, 4].map(n => (
              <div key={n} className="h-7 w-24 bg-slate-800 rounded-full"></div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2].map(n => (
            <div key={n} className="glass-panel rounded-2xl p-6 h-40 space-y-3">
              <div className="h-5 w-40 bg-slate-800 rounded"></div>
              <div className="h-3 w-full bg-slate-800 rounded"></div>
              <div className="h-3 w-5/6 bg-slate-800 rounded"></div>
            </div>
          ))}
        </div>

        <div className="space-y-4">
          <div className="h-5 w-48 bg-slate-800 rounded"></div>
          {[1, 2].map(n => (
            <div key={n} className="glass-panel rounded-xl p-6 h-24 bg-slate-800/20"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full max-w-xl mx-auto glass-panel rounded-2xl p-8 text-center space-y-4 border border-accent-rose/25">
        <ShieldAlert className="w-12 h-12 text-accent-rose mx-auto" />
        <h3 className="text-lg font-semibold text-slate-200">Retrieval Failure</h3>
        <p className="text-sm text-slate-400">{error}</p>
        <button
          onClick={fetchInsightsAndHistory}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg transition"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  const hasBadges = insights && insights.badges && insights.badges.length > 0;
  const hasInsights = insights && insights.insights && insights.insights.length > 0;
  const groupedEntries = getGroupedEntries();
  const monthKeys = Object.keys(groupedEntries);

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8">
      {/* 1. Theme Badges Section */}
      <div className="glass-panel rounded-2xl p-6 space-y-4 shadow-glass">
        <div className="flex items-center space-x-2 text-primary">
          <Sparkles className="w-5 h-5" />
          <h3 className="font-bold text-slate-200">Recurring Themes (Gemini Analyzed)</h3>
        </div>

        {hasBadges ? (
          <div className="flex flex-wrap gap-2.5 pt-1">
            {insights.badges.map((badge, idx) => (
              <span
                key={idx}
                className="px-3.5 py-1.5 text-xs font-medium bg-[#1A1A2E]/50 border border-primary/30 hover:border-primary text-slate-300 rounded-full transition-all duration-300 hover:shadow-glow-primary cursor-default"
              >
                ✦ {badge}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500 italic">No recurring themes identified yet.</p>
        )}
      </div>

      {/* 2. Insight Bullet Cards */}
      <div className="space-y-4">
        <div className="flex items-center space-x-2 text-accent-teal pl-1">
          <Activity className="w-5 h-5" />
          <h3 className="font-bold text-slate-200">Pattern Explanations</h3>
        </div>

        {hasInsights ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {insights.insights.map((insight, idx) => (
              <div
                key={idx}
                className="glass-panel-elevated rounded-2xl p-6 space-y-3 relative overflow-hidden transition-all duration-300 hover:border-accent-teal/30 hover:shadow-glow-teal group"
              >
                <div className="absolute right-0 top-0 w-16 h-16 bg-accent-teal/5 rounded-bl-full group-hover:bg-accent-teal/10 transition-colors"></div>
                <h4 className="font-bold text-slate-200 text-base flex items-center space-x-2">
                  <Compass className="w-4 h-4 text-accent-teal" />
                  <span>{insight.title}</span>
                </h4>
                <p className="text-sm text-slate-400 leading-relaxed">
                  {insight.description}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="glass-panel rounded-2xl p-8 text-center text-slate-500 italic">
            Create more daily entries to view automated trends.
          </div>
        )}
      </div>

      {/* 3. History Feed (Grouped Month-Wise with Accordion collapse) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between pl-1">
          <div className="flex items-center space-x-2 text-slate-300">
            <Calendar className="w-5 h-5" />
            <h3 className="font-bold text-slate-200">Journal Archive (Month-Wise)</h3>
          </div>
          <span className="text-xs text-slate-500 font-semibold bg-slate-800/40 px-2.5 py-1 rounded-full">
            {history.length} Entries Saved
          </span>
        </div>

        {monthKeys.length > 0 ? (
          <div className="space-y-6">
            {monthKeys.map((monthKey) => {
              const isExpanded = !!expandedMonths[monthKey];
              const monthEntries = groupedEntries[monthKey];

              return (
                <div key={monthKey} className="glass-panel rounded-2xl overflow-hidden border border-white/5 shadow-glass">
                  {/* Accordion header trigger */}
                  <button
                    onClick={() => toggleMonthExpansion(monthKey)}
                    className="w-full flex items-center justify-between p-5 bg-slate-900/40 hover:bg-slate-900/60 transition-colors duration-300 text-left"
                  >
                    <div className="flex items-center space-x-3">
                      <span className="font-bold text-slate-200 text-base">{monthKey}</span>
                      <span className="text-xs text-primary font-semibold bg-primary/10 border border-primary/20 px-2.5 py-0.5 rounded-full">
                        {monthEntries.length} {monthEntries.length === 1 ? 'entry' : 'entries'}
                      </span>
                    </div>
                    <div>
                      {isExpanded ? (
                        <ChevronDown className="w-5 h-5 text-slate-400" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-slate-400" />
                      )}
                    </div>
                  </button>

                  {/* Accordion content body list */}
                  {isExpanded && (
                    <div className="p-5 divide-y divide-white/5 space-y-4">
                      {monthEntries.map((entry) => (
                        <div
                          key={entry._id}
                          className="pt-4 first:pt-0 space-y-2.5"
                        >
                          <div className="flex items-center justify-between text-xs text-slate-400">
                            <div className="flex items-center space-x-1.5">
                              <MessageSquare className="w-3.5 h-3.5 text-primary" />
                              <span className="italic">"{entry.prompt}"</span>
                            </div>
                            <span className="text-[10px] text-slate-500 bg-slate-900/60 px-2 py-0.5 rounded border border-white/5 font-mono">
                              {formatDate(entry.date)}
                            </span>
                          </div>

                          <div className="pl-4 border-l-2 border-primary/50 text-slate-200 text-sm leading-relaxed font-medium">
                            {entry.summaryEntry}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="glass-panel rounded-2xl p-8 text-center text-slate-500 italic">
            You haven't saved any entries yet. Click the "Write Entry" tab to begin.
          </div>
        )}
      </div>
    </div>
  );
}
