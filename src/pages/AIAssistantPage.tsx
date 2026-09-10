import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { api, getStoredToken } from '../services/api.ts';
import {
  Sparkles,
  Zap,
  ShieldAlert,
  Bot,
  Send,
  Play,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Clock,
  Check,
  User,
  Activity,
  ToggleLeft,
  ToggleRight,
  LogIn,
  Search,
  Plus,
  ArrowUp,
  Building2,
  DollarSign,
  ShieldCheck,
  X,
  Share2,
} from 'lucide-react';
import { AIMessageRenderer } from '../components/ai/AIMessageRenderer.tsx';
import { AIMessageActions } from '../components/ai/AIMessageActions.tsx';
import { AIFullViewModal } from '../components/ai/AIFullViewModal.tsx';
import { AIShareModal } from '../components/ai/AIShareModal.tsx';

export const AIAssistantPage: React.FC = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'copilot' | 'automations' | 'anomalies'>('copilot');

  // Copilot Chat State
  const [messages, setMessages] = useState<
    Array<{
      role: 'user' | 'assistant';
      content: string;
      requiresConfirmation?: boolean;
      pendingAction?: any;
    }>
  >([]);
  const [input, setInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [conversationId, setConversationId] = useState<number | undefined>();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Response Actions Modals & Editing State
  const [fullViewContent, setFullViewContent] = useState<string | null>(null);
  const [shareContent, setShareContent] = useState<string | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingText, setEditingText] = useState('');

  // Automations State
  const [automations, setAutomations] = useState<any[]>([]);
  const [isAutoLoading, setIsAutoLoading] = useState(false);
  const [runningAutoId, setRunningAutoId] = useState<number | null>(null);

  // Anomalies State
  const [anomalies, setAnomalies] = useState<any[]>([]);
  const [isAnomalyLoading, setIsAnomalyLoading] = useState(false);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Dynamic greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const displayName = user?.employee?.firstName || user?.username || 'Executive';

  // Load automations & anomalies when tabs change
  useEffect(() => {
    if (activeTab === 'automations') {
      fetchAutomations();
    } else if (activeTab === 'anomalies') {
      fetchAnomalies();
      fetchAuditLogs();
    }
  }, [activeTab]);

  useEffect(() => {
    if (messages.length > 0) {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isChatLoading]);

  const fetchAutomations = async () => {
    try {
      setIsAutoLoading(true);
      const token = getStoredToken();
      const res = await fetch('/api/ai/automations', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setAutomations(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsAutoLoading(false);
    }
  };

  const fetchAnomalies = async () => {
    try {
      setIsAnomalyLoading(true);
      const token = getStoredToken();
      const res = await fetch('/api/ai/anomalies', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setAnomalies(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsAnomalyLoading(false);
    }
  };

  const handleResolveAnomaly = async (id: number) => {
    try {
      const token = getStoredToken();
      await fetch(`/api/ai/anomalies/${id}/resolve`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchAnomalies();
    } catch (err) {
      console.error('Failed to resolve anomaly:', err);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      const token = getStoredToken();
      const res = await fetch('/api/ai/activity', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setAuditLogs(data);
      }
    } catch (err) {
      console.warn('Could not load activity logs:', err);
    }
  };

  const handleToggleAutomation = async (id: number, currentActive: boolean) => {
    try {
      const token = getStoredToken();
      const res = await fetch(`/api/ai/automations/${id}/toggle`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isActive: !currentActive }),
      });
      if (res.ok) {
        setAutomations((prev) =>
          prev.map((a) => (a.id === id ? { ...a, isActive: !currentActive } : a))
        );
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRunAutomation = async (id: number) => {
    try {
      setRunningAutoId(id);
      const token = getStoredToken();
      const res = await fetch(`/api/ai/automations/${id}/run`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const result = await res.json();
        alert(`Automation Ran Successfully: ${result.summary}`);
        fetchAutomations();
      }
    } catch (err: any) {
      alert(`Error running automation: ${err.message}`);
    } finally {
      setRunningAutoId(null);
    }
  };

  const handleScanAnomalies = async () => {
    try {
      setIsAnomalyLoading(true);
      const token = getStoredToken();
      const res = await fetch('/api/ai/anomalies/scan', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setAnomalies(data.anomalies || []);
        alert(`Scan completed. Found ${data.count} anomaly records.`);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsAnomalyLoading(false);
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query || isChatLoading) return;

    setMessages((prev) => [...prev, { role: 'user', content: query }]);
    setInput('');
    setIsChatLoading(true);

    try {
      const data = await api.aiChat({
        message: query,
        conversationId,
      });

      if (data.conversationId) setConversationId(data.conversationId);

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: data.message,
          requiresConfirmation: data.requiresConfirmation,
          pendingAction: data.pendingAction,
        },
      ]);
    } catch (err: any) {
      const isAuth =
        err.message?.includes('expired') ||
        err.message?.includes('session') ||
        err.message?.includes('401') ||
        err.message?.includes('token');
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: isAuth
            ? `**Session Expired**: Your login session has timed out or is invalid. Please log in again to continue.`
            : `Error: ${err.message}`,
        },
      ]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleConfirmAction = async (action: any) => {
    setIsChatLoading(true);
    try {
      const data = await api.aiChat({
        conversationId,
        confirmedAction: action,
      });
      setMessages((prev) => [...prev, { role: 'assistant', content: data.message }]);
    } catch (err: any) {
      setMessages((prev) => [...prev, { role: 'assistant', content: `Error: ${err.message}` }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleNewThread = () => {
    setMessages([]);
    setConversationId(undefined);
    setInput('');
    setEditingIndex(null);
    setSearchQuery('');
  };

  const canManageAutomations =
    user?.roleName === 'Administrator' ||
    user?.roleName === 'HR Officer' ||
    user?.roleName === 'Management';

  // Filter messages if search query is present
  const displayedMessages = searchQuery.trim()
    ? messages.filter((m) =>
        m.content.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : messages;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Header & Navigation Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        {/* Model Badge & Title */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <span className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800/80 text-xs font-bold text-purple-700 dark:text-purple-300">
              <img src="/apex-copilot-logo.png" alt="Apex Copilot" className="h-4 w-4 rounded-full object-cover ring-1 ring-purple-500/40" />
              <span>Apex Copilot 2.5</span>
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Enterprise Intelligence
            </span>
          </div>
        </div>

        {/* Global Controls: Search, Hub Tabs, New Thread */}
        <div className="flex flex-wrap items-center gap-2">
          {activeTab === 'copilot' && (
            <>
              {isSearchOpen ? (
                <div className="flex items-center space-x-1 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1 text-xs">
                  <Search className="h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search thread..."
                    className="w-32 sm:w-44 bg-transparent border-0 focus:outline-none text-xs text-slate-900 dark:text-white"
                    autoFocus
                  />
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setIsSearchOpen(false);
                    }}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setIsSearchOpen(true)}
                  className="flex items-center space-x-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/80 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/60 transition shadow-2xs"
                  title="Search conversation"
                >
                  <Search className="h-3.5 w-3.5 text-slate-400" />
                  <span className="hidden sm:inline">Search thread</span>
                </button>
              )}

              {/* + New Thread Button (Inspired by Inspiration UI) */}
              <button
                onClick={handleNewThread}
                className="flex items-center space-x-1.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-3.5 py-1.5 text-xs font-bold hover:bg-slate-800 dark:hover:bg-slate-100 transition shadow-xs"
                title="Start a clean new conversation thread"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>New Thread</span>
              </button>
            </>
          )}

          {/* Tab Switcher */}
          <div className="flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1 text-xs ml-1">
            <button
              onClick={() => setActiveTab('copilot')}
              className={`flex items-center space-x-1.5 rounded-lg px-3 py-1 font-semibold transition ${
                activeTab === 'copilot'
                  ? 'bg-white dark:bg-slate-700 text-purple-600 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Bot className="h-3.5 w-3.5" />
              <span>Copilot</span>
            </button>

            {canManageAutomations && (
              <button
                onClick={() => setActiveTab('automations')}
                className={`flex items-center space-x-1.5 rounded-lg px-3 py-1 font-semibold transition ${
                  activeTab === 'automations'
                    ? 'bg-white dark:bg-slate-700 text-purple-600 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Zap className="h-3.5 w-3.5" />
                <span>Automations</span>
              </button>
            )}

            <button
              onClick={() => setActiveTab('anomalies')}
              className={`flex items-center space-x-1.5 rounded-lg px-3 py-1 font-semibold transition ${
                activeTab === 'anomalies'
                  ? 'bg-white dark:bg-slate-700 text-purple-600 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <ShieldAlert className="h-3.5 w-3.5" />
              <span>Anomalies</span>
            </button>
          </div>
        </div>
      </div>

      {/* =================================================== */}
      {/* TAB 1: COPILOT WORKSPACE (INSPIRATION DESIGN)      */}
      {/* =================================================== */}
      {activeTab === 'copilot' && (
        <div className="w-full">
          {/* STATE A: INSPIRATION HERO VIEW (When no messages) */}
          {messages.length === 0 ? (
            <div className="py-6 sm:py-10 flex flex-col items-center justify-center animate-in fade-in duration-300">
              {/* 1. 3D Iridescent Fluid Orb Logo */}
              <div className="relative my-4 flex items-center justify-center">
                {/* Outer pulsing color haze */}
                <div className="absolute h-32 w-32 rounded-full bg-gradient-to-tr from-fuchsia-600 via-purple-600 to-indigo-600 blur-2xl opacity-60 animate-pulse" />
                <div className="absolute h-24 w-24 rounded-full bg-gradient-to-bl from-pink-500 via-purple-500 to-cyan-500 blur-lg opacity-70" />

                {/* The 3D iridescent gem container with Logo */}
                <div className="relative h-24 w-24 rounded-full bg-gradient-to-tr from-indigo-700 via-purple-600 to-fuchsia-400 p-0.5 shadow-2xl shadow-purple-500/50 transform hover:scale-105 transition-transform duration-300">
                  <img
                    src="/apex-copilot-logo.png"
                    alt="Apex Copilot"
                    className="h-full w-full rounded-full object-cover shadow-inner"
                  />
                </div>
              </div>

              {/* 2. Personalized Time-of-Day Headline */}
              <div className="text-center space-y-1.5 mt-2">
                <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">
                  {getGreeting()}, <span className="font-bold">{displayName}</span>
                </h2>
                <p className="text-xl sm:text-2xl font-normal text-slate-600 dark:text-slate-300">
                  What insights do you need for your{' '}
                  <span className="font-semibold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 via-fuchsia-500 to-indigo-600 dark:from-purple-400 dark:to-indigo-300">
                    workforce today ?
                  </span>
                </p>
              </div>

              {/* 3. Hero Elevated Input Box */}
              <div className="w-full max-w-2xl mx-auto mt-7 rounded-2xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-800/90 shadow-xl shadow-slate-200/50 dark:shadow-none p-3.5 sm:p-4 transition-all focus-within:border-purple-500/80 focus-within:ring-2 focus-within:ring-purple-500/20">
                <div className="flex items-start gap-2.5">
                  <Sparkles className="h-4 w-4 text-purple-600 dark:text-purple-400 mt-1 shrink-0" />
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    rows={2}
                    placeholder="Ask Apex Copilot an attendance question, audit timesheets, or request a payroll ledger..."
                    className="w-full bg-transparent border-0 resize-none text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none leading-relaxed"
                  />
                </div>

                <div className="flex items-center justify-between pt-3 mt-2 border-t border-slate-100 dark:border-slate-700/60">
                  <div className="flex items-center space-x-2">
                    <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-700/70 text-[11px] font-medium text-slate-600 dark:text-slate-300">
                      <ShieldCheck className="h-3 w-3 text-purple-600 dark:text-purple-400" />
                      <span>{user?.roleName || 'Authorized'} Scope</span>
                    </span>
                    <span className="hidden sm:inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                      <Activity className="h-3 w-3 text-emerald-500" />
                      <span>PostgreSQL Grounded</span>
                    </span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => handleSendMessage()}
                      disabled={!input.trim() || isChatLoading}
                      className="h-8 w-8 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-slate-900 dark:disabled:hover:bg-white transition flex items-center justify-center shadow-xs cursor-pointer"
                      title="Send query (Enter)"
                    >
                      <ArrowUp className="h-4 w-4 font-bold" />
                    </button>
                  </div>
                </div>
              </div>

              {/* 4. Suggested Query Cards Grid (Tailored to Apex Enterprise) */}
              <div className="w-full max-w-4xl mx-auto mt-8">
                <p className="text-[11px] font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase text-center mb-4">
                  GET STARTED WITH A WORKFORCE QUERY BELOW
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                  {[
                    {
                      title: "Today's Tardiness Report",
                      desc: 'List employees arriving past 08:00 AM shift start with delay duration',
                      query: 'Who reported late today and what is their delay time?',
                      icon: Clock,
                    },
                    {
                      title: 'Payroll Summary Statement',
                      desc: "Summarize this month's gross salaries, overtime earnings, and net payout",
                      query: 'Show current payroll distribution and net disbursement summary',
                      icon: DollarSign,
                    },
                    {
                      title: 'Apex Corporate Profile',
                      desc: 'Explain Apex Enterprise SL Ltd services and smart QR attendance mechanics',
                      query: 'Tell me about Apex Enterprise SL Ltd, its services, and how the system works',
                      icon: Building2,
                    },
                    {
                      title: 'Anomaly & Fraud Scan',
                      desc: 'Run automated audit for check-in anomalies, duplicate scans, and ghost records',
                      query: 'Check for attendance anomalies and suspicious scan patterns',
                      icon: ShieldAlert,
                    },
                  ].map((card, idx) => {
                    const Icon = card.icon;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSendMessage(card.query)}
                        className="group text-left flex flex-col justify-between p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/70 hover:border-purple-400 dark:hover:border-purple-500 hover:shadow-md transition-all duration-200 cursor-pointer h-36"
                      >
                        <div>
                          <p className="text-xs font-bold text-slate-800 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                            {card.title}
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-1 leading-relaxed">
                            {card.desc}
                          </p>
                        </div>
                        <div className="pt-2">
                          <div className="h-7 w-7 rounded-lg bg-slate-100 dark:bg-slate-700/60 flex items-center justify-center text-slate-600 dark:text-slate-300 group-hover:bg-purple-50 dark:group-hover:bg-purple-950/60 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                            <Icon className="h-3.5 w-3.5" />
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            /* STATE B: ACTIVE CHAT CANVAS (Modern Feed + Pinned Hero Input) */
            <div className="flex flex-col h-[700px] rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden animate-in fade-in duration-200">
              {/* Thread Info Strip */}
              <div className="px-5 py-2.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/40 text-xs">
                <div className="flex items-center space-x-2">
                  <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    Active Intelligence Session
                  </span>
                  <span className="text-slate-400">•</span>
                  <span className="text-slate-500 dark:text-slate-400 text-[11px]">
                    {messages.length} message{messages.length === 1 ? '' : 's'}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleNewThread}
                  className="flex items-center space-x-1 text-purple-600 dark:text-purple-400 hover:underline font-semibold text-[11px]"
                >
                  <Plus className="h-3 w-3" />
                  <span>Start New Thread</span>
                </button>
              </div>

              {/* Chat Message Stream */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
                {displayedMessages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {msg.role === 'assistant' && (
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl overflow-hidden border border-purple-400/40 shadow-xs">
                        <img src="/apex-copilot-logo.png" alt="Apex Copilot" className="h-full w-full object-cover" />
                      </div>
                    )}
                    <div
                      className={`max-w-[85%] rounded-2xl p-4 text-xs leading-relaxed ${
                        msg.role === 'user'
                          ? 'bg-purple-600 text-white rounded-tr-xs shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-800/90 text-slate-900 dark:text-slate-100 rounded-tl-xs border border-slate-200/80 dark:border-slate-700/80 shadow-2xs'
                      }`}
                    >
                      {/* Inline Editing Mode */}
                      {editingIndex === idx && msg.role === 'assistant' ? (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between pb-1 border-b border-slate-200 dark:border-slate-700">
                            <span className="text-[11px] font-bold text-purple-600 dark:text-purple-400">
                              Editing AI Response
                            </span>
                            <span className="text-[10px] text-slate-400">
                              Markdown syntax enabled
                            </span>
                          </div>
                          <textarea
                            value={editingText}
                            onChange={(e) => setEditingText(e.target.value)}
                            rows={Math.min(10, Math.max(4, editingText.split('\n').length))}
                            className="w-full rounded-lg border border-purple-400 dark:border-purple-600 bg-white dark:bg-slate-900 p-2.5 text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-1 focus:ring-purple-500"
                          />
                          <div className="flex items-center justify-end space-x-2 pt-1">
                            <button
                              type="button"
                              onClick={() => setEditingIndex(null)}
                              className="rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-1 text-[11px] font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setMessages((prev) => {
                                  const copy = [...prev];
                                  copy[idx] = { ...copy[idx], content: editingText };
                                  return copy;
                                });
                                setEditingIndex(null);
                              }}
                              className="rounded-lg bg-purple-600 px-3 py-1 text-[11px] font-bold text-white hover:bg-purple-700 transition shadow-xs"
                            >
                              Save Changes
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          {/* Rich Structured AI Output */}
                          <AIMessageRenderer content={msg.content} />

                          {/* Response Action Bar (PDF, CSV, Copy, Edit, Share, Full View) */}
                          {msg.role === 'assistant' && (
                            <AIMessageActions
                              content={msg.content}
                              onStartEdit={() => {
                                setEditingIndex(idx);
                                setEditingText(msg.content);
                              }}
                              onFullView={() => setFullViewContent(msg.content)}
                              onShare={() => setShareContent(msg.content)}
                            />
                          )}
                        </>
                      )}

                      {/* Session Expiry Action */}
                      {msg.role === 'assistant' &&
                        (msg.content.includes('Session Expired') ||
                          msg.content.includes('log in again')) && (
                          <div className="mt-2.5 pt-2 border-t border-slate-200 dark:border-slate-700">
                            <button
                              type="button"
                              onClick={() => logout()}
                              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-semibold text-[11px] transition shadow-xs"
                            >
                              <LogIn className="h-3.5 w-3.5" />
                              <span>Log In Again</span>
                            </button>
                          </div>
                        )}

                      {/* Confirmation Prompt */}
                      {msg.requiresConfirmation && msg.pendingAction && (
                        <div className="mt-3 rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40 p-3 text-amber-900 dark:text-amber-200">
                          <p className="font-bold mb-1">Confirmation Required</p>
                          <p className="text-[11px] mb-2">{msg.pendingAction.prompt}</p>
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleConfirmAction(msg.pendingAction)}
                              className="rounded-lg bg-amber-600 px-3 py-1 text-[11px] font-bold text-white hover:bg-amber-700 cursor-pointer"
                            >
                              Confirm Action
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                    {msg.role === 'user' && (
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                        <User className="h-4 w-4" />
                      </div>
                    )}
                  </div>
                ))}

                {isChatLoading && (
                  <div className="flex items-center space-x-2.5 text-xs text-purple-600 dark:text-purple-400 py-2">
                    <div className="h-6 w-6 rounded-lg overflow-hidden border border-purple-400/40 shadow-xs flex items-center justify-center">
                      <img src="/apex-copilot-logo.png" alt="Apex Copilot" className="h-full w-full object-cover animate-pulse" />
                    </div>
                    <span className="font-medium animate-pulse">
                      Consulting Apex Intelligence Engine...
                    </span>
                  </div>
                )}
                <div ref={chatBottomRef} />
              </div>

              {/* Bottom Input Area in Ongoing Chat */}
              <div className="border-t border-slate-200 dark:border-slate-800 p-3 bg-slate-50/50 dark:bg-slate-800/40">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendMessage();
                  }}
                  className="flex items-center space-x-2"
                >
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ask a question or request an attendance/payroll action..."
                    disabled={isChatLoading}
                    className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                  />
                  <button
                    type="submit"
                    disabled={!input.trim() || isChatLoading}
                    className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 disabled:opacity-40 transition shadow-xs cursor-pointer"
                    title="Send message"
                  >
                    <ArrowUp className="h-4 w-4" />
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* =================================================== */}
      {/* TAB 2: AUTOMATIONS MANAGER                          */}
      {/* =================================================== */}
      {activeTab === 'automations' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Scheduled Automation Workflows
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                10 enterprise rules pre-configured. Toggled rules execute automatically in the background.
              </p>
            </div>
            <button
              onClick={fetchAutomations}
              disabled={isAutoLoading}
              className="flex items-center space-x-1.5 rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isAutoLoading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {automations.map((auto) => (
              <div
                key={auto.id}
                className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/80 p-4 shadow-xs space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="inline-block rounded-md bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-400 text-[10px] font-bold uppercase px-2 py-0.5 mb-1">
                      {auto.triggerType}
                    </span>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">{auto.name}</h4>
                  </div>
                  <button
                    onClick={() => handleToggleAutomation(auto.id, auto.isActive)}
                    className="text-slate-400 hover:text-purple-600"
                    title={auto.isActive ? 'Active (Click to disable)' : 'Disabled (Click to enable)'}
                  >
                    {auto.isActive ? (
                      <ToggleRight className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                    ) : (
                      <ToggleLeft className="h-6 w-6" />
                    )}
                  </button>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  {auto.description}
                </p>
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-700/60 text-[11px] text-slate-400">
                  <span>Target: {auto.actionTarget}</span>
                  <button
                    onClick={() => handleRunAutomation(auto.id)}
                    disabled={runningAutoId === auto.id}
                    className="flex items-center space-x-1 text-purple-600 dark:text-purple-400 hover:underline font-semibold"
                  >
                    <Play className="h-3 w-3" />
                    <span>{runningAutoId === auto.id ? 'Running...' : 'Run Now'}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =================================================== */}
      {/* TAB 3: ANOMALIES & AUDIT LOGS                       */}
      {/* =================================================== */}
      {activeTab === 'anomalies' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Workforce Attendance Anomaly Detection
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Automated detection of ghost check-ins, rapid scans, missing punches, and attendance spoofing.
              </p>
            </div>
            <button
              onClick={handleScanAnomalies}
              disabled={isAnomalyLoading}
              className="flex items-center space-x-1.5 rounded-xl bg-purple-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-purple-700 transition shadow-xs"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isAnomalyLoading ? 'animate-spin' : ''}`} />
              <span>Scan Database Now</span>
            </button>
          </div>

          <div className="space-y-2">
            {anomalies.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/50 p-8 text-center">
                <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
                <h4 className="text-xs font-bold text-slate-900 dark:text-white">No Anomalies Found</h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  All employee check-in logs and overtime patterns conform to system standards.
                </p>
              </div>
            ) : (
              anomalies.map((anom) => (
                <div
                  key={anom.id}
                  className="flex items-center justify-between rounded-xl border border-rose-200 dark:border-rose-900/40 bg-rose-50/50 dark:bg-rose-950/20 p-3 text-xs"
                >
                  <div className="flex items-center space-x-3">
                    <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
                    <div>
                      <span className="font-bold text-slate-900 dark:text-white">{anom.type}</span>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400">{anom.description}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleResolveAnomaly(anom.id)}
                    className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1 text-[11px] font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
                  >
                    Resolve
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Full View Modal */}
      {fullViewContent && (
        <AIFullViewModal
          content={fullViewContent}
          onClose={() => setFullViewContent(null)}
          onShare={() => {
            const c = fullViewContent;
            setFullViewContent(null);
            setShareContent(c);
          }}
        />
      )}

      {/* Share Modal */}
      {shareContent && (
        <AIShareModal
          content={shareContent}
          onClose={() => setShareContent(null)}
        />
      )}
    </div>
  );
};
