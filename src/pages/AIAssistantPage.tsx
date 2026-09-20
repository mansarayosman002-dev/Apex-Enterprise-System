import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { api } from '../services/api.ts';
import {
  Bot,
  Send,
  Zap,
  AlertTriangle,
  BookOpen,
  RefreshCw,
  Play,
  CheckCircle2,
  Clock,
  Shield,
  Database,
  Briefcase,
  Users,
  ChevronRight,
  Plus,
  Trash2,
  Lock,
  ArrowUpRight,
  Search,
  Share2,
  Paperclip,
  Code,
  Mail,
  User,
  MessageSquare,
  ChevronDown,
  ArrowUp,
  FileText,
  FileSpreadsheet,
  Sparkles,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Badge } from '../components/common/Badge.tsx';
import { AIAssistantLogo } from '../components/ai/AIAssistantLogo.tsx';
import { AIMessageActionToolbar } from '../components/ai/AIMessageActionToolbar.tsx';
import { AIFullViewModal } from '../components/ai/AIFullViewModal.tsx';
import { AIMarkdownRenderer } from '../components/ai/AIMarkdownRenderer.tsx';
import { UserAvatar } from '../components/common/UserAvatar.tsx';
import { shareAiResponse } from '../utils/aiExportUtils.ts';

interface ChatMsg {
  id?: number;
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
  writingStyle?: string;
}

export const AIAssistantPage: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'chat' | 'automations' | 'anomalies' | 'knowledge'>('chat');

  // Chat conversation state
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<number | undefined>();
  const [writingStyle, setWritingStyle] = useState<'Executive' | 'Statutory' | 'Analytical' | 'Concise'>('Statutory');
  const [isStyleDropdownOpen, setIsStyleDropdownOpen] = useState(false);
  const [isCaptionActive, setIsCaptionActive] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Full View Modal state
  const [fullViewModal, setFullViewModal] = useState<{
    isOpen: boolean;
    title: string;
    content: string;
    timestamp?: string;
  }>({
    isOpen: false,
    title: '',
    content: '',
  });

  // Automations state
  const [automations, setAutomations] = useState<any[]>([]);
  const [automationHistory, setAutomationHistory] = useState<any[]>([]);
  const [runningTaskId, setRunningTaskId] = useState<number | null>(null);

  // Anomalies state
  const [anomalies, setAnomalies] = useState<any[]>([]);
  const [isScanningAnomalies, setIsScanningAnomalies] = useState(false);

  // Knowledge state
  const [knowledge, setKnowledge] = useState<{
    businessRules: any[];
    dataDictionary: Record<string, any>;
    securityPolicies: Record<string, any>;
  } | null>(null);

  // Determine greeting based on current time
  const getGreetingTime = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  const userDisplayName = user?.username
    ? user.username.charAt(0).toUpperCase() + user.username.slice(1).split('.')[0]
    : 'Colleague';

  useEffect(() => {
    if (messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading]);

  useEffect(() => {
    if (activeTab === 'automations') {
      loadAutomations();
    } else if (activeTab === 'anomalies') {
      loadAnomalies();
    } else if (activeTab === 'knowledge' && !knowledge) {
      loadKnowledge();
    }
  }, [activeTab]);

  const loadAutomations = async () => {
    try {
      const [list, hist] = await Promise.all([
        api.getAiAutomations().catch(() => []),
        api.getAiAutomationHistory().catch(() => []),
      ]);
      setAutomations(list);
      setAutomationHistory(hist);
    } catch (e) {
      console.error('Failed to load automations:', e);
    }
  };

  const loadAnomalies = async () => {
    setIsScanningAnomalies(true);
    try {
      const list = await api.getAiAnomalies();
      setAnomalies(list);
    } catch (e) {
      console.error('Failed to load anomalies:', e);
    } finally {
      setIsScanningAnomalies(false);
    }
  };

  const loadKnowledge = async () => {
    try {
      const data = await api.getAiKnowledge();
      setKnowledge(data);
    } catch (e) {
      console.error('Failed to load knowledge:', e);
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const prompt = (textToSend || inputMessage).trim();
    if (!prompt || isLoading) return;

    const userMsg: ChatMsg = {
      role: 'user',
      content: prompt,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const res = await api.aiChat(prompt, conversationId);
      if (res.conversationId) setConversationId(res.conversationId);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: res.message,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          writingStyle,
        },
      ]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `Sorry, an error occurred: ${err.message || 'Processing failed.'}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartNewThread = () => {
    setMessages([]);
    setConversationId(undefined);
    setInputMessage('');
  };

  const handleToggleAutomation = async (id: number, current: boolean) => {
    try {
      await api.toggleAiAutomation(id, !current);
      setAutomations((prev) =>
        prev.map((a) => (a.id === id ? { ...a, isActive: !current } : a))
      );
    } catch (e) {
      console.error('Toggle automation error:', e);
    }
  };

  const handleRunAutomation = async (id: number) => {
    setRunningTaskId(id);
    try {
      const res = await api.runAiAutomation(id);
      alert(`Automation completed: ${res.summary}`);
      loadAutomations();
    } catch (e: any) {
      alert(`Execution failed: ${e.message || 'Error'}`);
    } finally {
      setRunningTaskId(null);
    }
  };

  // Example starter cards inspired by the reference design
  const starterCards = [
    {
      icon: User,
      title: 'Late Arrivals',
      description: 'Who checked in after the 08:30 AM cutoff today?',
      prompt: 'Who arrived after 08:30:00 AM today? Show employee codes, arrival times, and department names.',
    },
    {
      icon: Mail,
      title: 'Staff Notice',
      description: 'Draft attendance reminder for absent staff',
      prompt: 'Draft an official corporate HR notification for employees who were absent without approved leave today.',
    },
    {
      icon: MessageSquare,
      title: 'NASSIT & PAYE',
      description: 'Statutory pension & tax brackets summary',
      prompt: 'Explain official Sierra Leone statutory payroll rules: NASSIT 5%/10% and progressive PAYE tax brackets.',
    },
    {
      icon: Code,
      title: 'Audit Check',
      description: 'Scan payroll records for calculation anomalies',
      prompt: 'Perform an audit on recent attendance and payroll records for excessive overtime or negative salary anomalies.',
    },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* ---------------------------------------------------- */}
      {/* Top Header Bar (Clean Minimalist Design)             */}
      {/* ---------------------------------------------------- */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800/80 pb-4">
        <div className="flex items-center space-x-3">
          <AIAssistantLogo size="md" withGlow={true} animated={true} />
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-base sm:text-lg font-bold tracking-tight text-slate-900 dark:text-white">
                Apex AI Copilot
              </h1>
              <span className="inline-flex items-center rounded-full bg-purple-500/10 px-2 py-0.5 text-[10px] font-semibold text-purple-600 dark:text-purple-300 border border-purple-500/20">
                Enterprise
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Enterprise HR & Payroll Assistant
            </p>
          </div>
        </div>

        {/* Action Controls & Tab Switcher */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search thread..."
              className="w-36 sm:w-44 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-1.5 pl-8 pr-3 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
          </div>

          {/* Share Thread Button */}
          <button
            type="button"
            onClick={() => {
              if (messages.length > 0) {
                const fullText = messages.map((m) => `${m.role.toUpperCase()}: ${m.content}`).join('\n\n');
                shareAiResponse('Apex AI Conversation Thread', fullText);
              } else {
                alert('No conversation history to share.');
              }
            }}
            className="inline-flex items-center space-x-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition active:scale-95"
            title="Share thread"
          >
            <Share2 className="h-3.5 w-3.5 text-slate-400" />
            <span className="hidden sm:inline">Share</span>
          </button>

          {/* New Thread Button */}
          <button
            type="button"
            onClick={handleStartNewThread}
            className="inline-flex items-center space-x-1.5 rounded-xl bg-slate-900 dark:bg-white px-3.5 py-1.5 text-xs font-bold text-white dark:text-slate-950 shadow-sm hover:opacity-90 transition active:scale-95"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>New Thread</span>
          </button>
        </div>
      </div>

      {/* Tab Navigation Pill Bar with Smooth Sliding Spring Indicator */}
      <div className="flex items-center space-x-1.5 border-b border-slate-200 dark:border-slate-800 pb-2.5 overflow-x-auto no-scrollbar">
        {[
          { id: 'chat', label: 'Copilot Chat', icon: Bot, badge: 'Live AI' },
          { id: 'automations', label: 'Task Automations', icon: Zap, badge: `${automations.length || 3}` },
          { id: 'anomalies', label: 'Anomaly Detection', icon: AlertTriangle, badge: anomalies.length ? `${anomalies.length}` : null, badgeColor: 'bg-rose-500 text-white' },
          { id: 'knowledge', label: 'Knowledge Hub', icon: BookOpen, badge: null },
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          const IconComp = tab.icon;
          return (
            <motion.button
              key={tab.id}
              type="button"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setActiveTab(tab.id as any)}
              className={`relative flex items-center space-x-2 rounded-xl px-4 py-2 text-xs font-bold transition-colors select-none cursor-pointer ${isActive
                ? 'text-white'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-slate-800/60'
                }`}
            >
              {isActive && (
                <motion.div
                  layoutId="aiHubActiveTab"
                  className="absolute inset-0 rounded-xl bg-gradient-to-r from-purple-600 via-fuchsia-600 to-indigo-600 shadow-md shadow-purple-600/35 border border-purple-400/30"
                  transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                />
              )}
              <span className="relative z-10 flex items-center space-x-2">
                <IconComp className={`h-4 w-4 transition-transform duration-200 ${isActive ? 'scale-110' : ''}`} />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[9px] font-black tracking-tight ${tab.badgeColor || (isActive ? 'bg-white/25 text-white' : 'bg-purple-100 text-purple-700 dark:bg-purple-950/80 dark:text-purple-300')
                      }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </span>
            </motion.button>
          );
        })}
      </div>

      {/* ---------------------------------------------------- */}
      {/* Dynamic Animated Tab Viewports                       */}
      {/* ---------------------------------------------------- */}
      <AnimatePresence mode="wait">
        {/* ---------------------------------------------------- */}
        {/* 1. COPILOT CHAT TAB (Design Inspiration Implemented) */}
        {/* ---------------------------------------------------- */}
        {activeTab === 'chat' && (
          <motion.div
            key="chat"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col min-h-[620px]"
          >
            {/* If no messages yet, display the centered Hero View */}
            {messages.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center py-8 sm:py-14 px-4 text-center">
                {/* Centered Glowing 3D Crystal Orb Logo with Multi-Layered Premium Animation */}
                <div className="relative mb-8 flex flex-col items-center justify-center">
                  {/* 1. Ambient Cosmic Glow Ring */}
                  <div className="absolute -inset-10 rounded-full bg-gradient-to-tr from-purple-600/35 via-fuchsia-500/25 to-indigo-600/30 blur-2xl animate-orb-glow pointer-events-none" />

                  {/* 2. Slow Rotating Outer Dashed Orbital Ring */}
                  <div className="absolute -inset-4 rounded-full border border-dashed border-purple-400/50 dark:border-purple-400/40 animate-orb-ring-spin pointer-events-none" />

                  {/* 3. Counter-Rotating Radiant Gradient Halo Ring */}
                  <div className="absolute -inset-7 rounded-full border border-purple-500/20 dark:border-fuchsia-500/20 border-t-purple-400 border-b-fuchsia-400 animate-orb-ring-spin-reverse pointer-events-none" />

                  {/* 4. Core Levitation Capsule (Silky Smooth Floating Physics) */}
                  <motion.div
                    className="relative z-10 animate-orb-levitate cursor-pointer group"
                    whileHover={{ scale: 1.08 }}
                    whileTap={{ scale: 0.96 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  >
                    <AIAssistantLogo size="hero" withGlow={true} animated={false} />
                  </motion.div>

                  {/* 5. Realistic Dynamic Contact Shadow beneath the Floating Orb */}
                  <div className="w-20 sm:w-24 h-3.5 rounded-full bg-purple-950/25 dark:bg-purple-950/70 blur-md mt-2.5 animate-orb-shadow pointer-events-none" />
                </div>

                {/* Centered Greeting with Staggered Kinetic Entrance */}
                <motion.h2
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                  className="text-2xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white"
                >
                  {getGreetingTime()}, {userDisplayName}
                </motion.h2>

                {/* Sub-headline with Shimmering Gradient Flow Animation */}
                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.65, delay: 0.18, ease: [0.22, 1, 0.36, 1] }}
                  className="text-2xl sm:text-4xl font-extrabold tracking-tight mt-1 text-slate-800 dark:text-slate-200"
                >
                  What's on{' '}
                  <span className="relative inline-block">
                    <span className="bg-gradient-to-r from-purple-600 via-fuchsia-500 via-pink-400 to-indigo-500 dark:from-purple-400 dark:via-fuchsia-300 dark:via-pink-400 dark:to-indigo-300 bg-clip-text text-transparent animate-text-gradient drop-shadow-[0_0_16px_rgba(192,38,211,0.35)]">
                      your mind ?
                    </span>
                    {/* Subtle expanding laser underline */}
                    <motion.span
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: 1 }}
                      transition={{ duration: 0.8, delay: 0.5, ease: 'easeOut' }}
                      className="absolute -bottom-1 left-0 right-0 h-[2px] rounded-full bg-gradient-to-r from-transparent via-fuchsia-500 to-transparent opacity-80"
                    />
                  </span>
                </motion.p>

                {/* Floating Prompt Card Container with Ambient Aurora Glow */}
                <motion.div
                  initial={{ opacity: 0, y: 22 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.55, delay: 0.28, ease: [0.22, 1, 0.36, 1] }}
                  className="w-full max-w-2xl mt-8 relative group"
                >
                  {/* Ambient breathing aura behind the prompt card */}
                  <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-purple-600/30 via-fuchsia-500/20 to-indigo-600/30 blur-xl opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-500 pointer-events-none" />

                  <div className="relative rounded-2xl border border-purple-500/25 dark:border-slate-700/80 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl p-4 sm:p-5 shadow-xl shadow-purple-950/15 transition-all duration-300 focus-within:border-purple-500 focus-within:ring-4 focus-within:ring-purple-500/20 focus-within:shadow-2xl focus-within:shadow-purple-950/25">
                    <div>
                      <textarea
                        rows={2}
                        value={inputMessage}
                        onChange={(e) => setInputMessage(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage();
                          }
                        }}
                        placeholder="Message Apex AI... (e.g. 'Who is late today?')"
                        className="w-full resize-none border-none bg-transparent text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-0"
                      />
                    </div>

                    {/* Bottom Controls Pill Bar */}
                    <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center space-x-2">
                        {/* Attach Pill */}
                        <motion.button
                          type="button"
                          whileHover={{ scale: 1.04 }}
                          whileTap={{ scale: 0.96 }}
                          onClick={() => alert('Attachments supported via attendance/payroll audit tools.')}
                          className="inline-flex items-center space-x-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                        >
                          <Paperclip className="h-3.5 w-3.5 text-slate-400" />
                          <span>Attach</span>
                        </motion.button>

                        {/* Writing Styles Pill Dropdown */}
                        <div className="relative">
                          <motion.button
                            type="button"
                            whileHover={{ scale: 1.04 }}
                            whileTap={{ scale: 0.96 }}
                            onClick={() => setIsStyleDropdownOpen(!isStyleDropdownOpen)}
                            className="inline-flex items-center space-x-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                          >
                            <span>Style: {writingStyle}</span>
                            <ChevronDown className={`h-3 w-3 text-slate-400 transition-transform duration-200 ${isStyleDropdownOpen ? 'rotate-180 text-purple-500' : ''}`} />
                          </motion.button>

                          <AnimatePresence>
                            {isStyleDropdownOpen && (
                              <motion.div
                                initial={{ opacity: 0, y: -8, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -8, scale: 0.95 }}
                                transition={{ duration: 0.18, ease: 'easeOut' }}
                                className="absolute left-0 mt-1.5 w-44 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl p-1.5 shadow-2xl z-20"
                              >
                                {(['Statutory', 'Executive', 'Analytical', 'Concise'] as const).map((style) => (
                                  <button
                                    key={style}
                                    type="button"
                                    onClick={() => {
                                      setWritingStyle(style);
                                      setIsStyleDropdownOpen(false);
                                    }}
                                    className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${writingStyle === style
                                      ? 'bg-purple-600 text-white shadow-xs font-bold'
                                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                                      }`}
                                  >
                                    {style} Mode
                                  </button>
                                ))}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>

                      {/* Right side: Caption toggle & Send Arrow Button */}
                      <div className="flex items-center space-x-3">
                        <label className="inline-flex items-center space-x-1.5 cursor-pointer text-xs text-slate-500 dark:text-slate-400 select-none">
                          <input
                            type="checkbox"
                            checked={isCaptionActive}
                            onChange={(e) => setIsCaptionActive(e.target.checked)}
                            className="sr-only"
                          />
                          <div
                            className={`h-4 w-7 rounded-full transition-colors relative ${isCaptionActive ? 'bg-purple-600' : 'bg-slate-300 dark:bg-slate-700'
                              }`}
                          >
                            <div
                              className={`h-3 w-3 rounded-full bg-white transition-transform absolute top-0.5 left-0.5 ${isCaptionActive ? 'translate-x-3' : ''
                                }`}
                            />
                          </div>
                          <span className="text-[11px] font-medium">Compliance</span>
                        </label>

                        <motion.button
                          type="button"
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.92 }}
                          onClick={() => handleSendMessage()}
                          disabled={!inputMessage.trim() || isLoading}
                          className="flex h-8.5 w-8.5 items-center justify-center rounded-xl bg-slate-950 dark:bg-purple-600 text-white shadow-md shadow-purple-600/30 hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
                          title="Send Prompt"
                        >
                          <ArrowUp className="h-4 w-4" />
                        </motion.button>
                      </div>
                    </div>
                  </div>
                </motion.div>

                {/* "GET STARTED WITH AN EXAMPLE BELOW" Section */}
                <motion.div
                  initial={{ opacity: 0, y: 22 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.38, ease: [0.22, 1, 0.36, 1] }}
                  className="w-full max-w-5xl mt-10 text-left"
                >
                  <div className="flex items-center space-x-2 mb-3 px-1">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500" />
                    </span>
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                      Get started with an example below
                    </p>
                  </div>

                  {/* 4 Interactive Starter Example Cards in one straight horizontal line */}
                  <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {[
                      {
                        title: 'Grace Period Rule',
                        description: 'What is the standard Sierra Leone shift grace period at Apex HRMS?',
                        prompt: 'Explain the shift grace period policy and late penalty threshold under Sierra Leone labour rules.',
                        icon: Clock,
                      },
                      {
                        title: 'NASSIT Breakdown',
                        description: 'Calculate employee vs employer NASSIT deductions for SLE 10,000.',
                        prompt: 'Break down the 5% employee and 10% employer NASSIT pension contributions for a gross salary of SLE 10,000.',
                        icon: FileSpreadsheet,
                      },
                      {
                        title: 'Overtime Multipliers',
                        description: 'Show how weekday 1.5x and holiday 2.0x rates are calculated.',
                        prompt: 'What are the legal overtime rates for normal working weekdays vs public holidays in Sierra Leone?',
                        icon: Zap,
                      },
                      {
                        title: 'Smart QR Cards',
                        description: 'How do CR80 encrypted NFC/QR employee ID badges work?',
                        prompt: 'Explain the CR80 ID-1 standard smart employee badge format and how QR codes prevent attendance fraud.',
                        icon: Sparkles,
                      },
                    ].map((card, idx) => {
                      const IconComp = card.icon;
                      return (
                        <motion.button
                          key={idx}
                          type="button"
                          whileHover={{ y: -4, scale: 1.02 }}
                          whileTap={{ scale: 0.97 }}
                          transition={{ type: 'spring', stiffness: 400, damping: 24 }}
                          onClick={() => handleSendMessage(card.prompt)}
                          className="flex flex-col justify-between h-full min-h-[135px] rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md p-4 text-left shadow-xs hover:border-purple-500/60 hover:shadow-lg hover:shadow-purple-950/10 transition-all duration-300 group cursor-pointer"
                        >
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 block mb-1">
                              {card.title}
                            </span>
                            <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 group-hover:text-purple-600 dark:group-hover:text-purple-300 transition-colors leading-snug">
                              {card.description}
                            </p>
                          </div>
                          <div className="mt-3 flex items-center justify-between text-slate-400 group-hover:text-purple-500 transition-colors">
                            <div className="p-1.5 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 group-hover:scale-110 transition-transform">
                              <IconComp className="h-4 w-4" />
                            </div>
                            <ArrowUpRight className="h-3.5 w-3.5 opacity-0 -translate-x-1 translate-y-1 group-hover:opacity-100 group-hover:translate-x-0 group-hover:translate-y-0 transition-all" />
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>
                </motion.div>
              </div>
            ) : (
              /* Active Message Stream View */
              <div className="flex flex-col rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm h-[640px] overflow-hidden">
                {/* Message List */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
                  {messages.map((m, idx) => {
                    const isUser = m.role === 'user';
                    return (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, y: 14, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                        className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
                      >
                        {/* Avatar with User Photo on user messages */}
                        {isUser ? (
                          <UserAvatar size="sm" className="mt-1 shadow-sm" />
                        ) : (
                          <AIAssistantLogo size="sm" withGlow={false} className="mt-1" />
                        )}

                        {/* Message Bubble Card */}
                        <div
                          className={`max-w-[85%] sm:max-w-[80%] rounded-2xl p-4 text-xs sm:text-sm leading-relaxed shadow-xs ${isUser
                            ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-tr-xs shadow-md shadow-purple-600/20'
                            : 'bg-slate-50 dark:bg-slate-800/90 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700/80 rounded-tl-xs'
                            }`}
                        >
                          {/* Header tag for AI message */}
                          {!isUser && (
                            <div className="flex items-center justify-between gap-2 mb-2 pb-1.5 border-b border-slate-200/60 dark:border-slate-700/60 text-[11px] text-slate-400">
                              <span className="font-semibold text-purple-600 dark:text-purple-300">
                                Apex AI Copilot
                              </span>
                              {m.timestamp && <span>{m.timestamp}</span>}
                            </div>
                          )}

                          {/* Rich formatted AI text, headings, tables, and lists */}
                          <AIMarkdownRenderer content={m.content} isUser={isUser} />

                          {/* Action Toolbar on AI response: Full View, PDF, Excel, Share */}
                          {!isUser && (
                            <AIMessageActionToolbar
                              content={m.content}
                              title="Apex AI Copilot Intelligence Report"
                              username={user?.username}
                              compact={false}
                              onOpenFullView={() =>
                                setFullViewModal({
                                  isOpen: true,
                                  title: 'Apex AI Copilot Intelligence Report',
                                  content: m.content,
                                  timestamp: m.timestamp,
                                })
                              }
                            />
                          )}
                        </div>
                      </motion.div>
                    );
                  })}

                  <AnimatePresence>
                    {isLoading && (
                      <motion.div
                        initial={{ opacity: 0, y: 12, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.25 }}
                        className="relative flex items-center space-x-3 text-xs text-purple-700 dark:text-purple-300 py-3 px-4 bg-gradient-to-r from-purple-500/10 via-fuchsia-500/10 to-indigo-500/10 rounded-2xl w-fit border border-purple-400/30 dark:border-purple-500/30 shadow-md shadow-purple-950/5 overflow-hidden"
                      >
                        <span className="absolute inset-0 bg-gradient-to-r from-transparent via-purple-500/15 to-transparent animate-shimmer pointer-events-none" />
                        <div className="relative flex items-center justify-center">
                          <AIAssistantLogo size="xs" withGlow={false} />
                          <span className="absolute -inset-1 rounded-full bg-purple-500/40 animate-ping opacity-50 pointer-events-none" />
                        </div>
                        <div className="flex items-center space-x-2 relative z-10">
                          <span className="font-semibold">Apex AI is analyzing workforce records & statutory rules</span>
                          <span className="flex space-x-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-purple-500 animate-bounce [animation-delay:-0.3s]" />
                            <span className="h-1.5 w-1.5 rounded-full bg-fuchsia-500 animate-bounce [animation-delay:-0.15s]" />
                            <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-bounce" />
                          </span>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <div ref={messagesEndRef} />
                </div>

                {/* Bottom Fixed Prompt Input Card */}
                <div className="border-t border-slate-200 dark:border-slate-800 p-3.5 bg-slate-50 dark:bg-slate-950/80">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSendMessage();
                    }}
                    className="flex items-center space-x-2"
                  >
                    <input
                      type="text"
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      placeholder="Message Apex AI..."
                      disabled={isLoading}
                      className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2.5 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-purple-500 focus:outline-hidden focus:ring-1 focus:ring-purple-500"
                    />
                    <button
                      type="submit"
                      disabled={!inputMessage.trim() || isLoading}
                      className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-600 text-white shadow-md shadow-purple-600/30 hover:bg-purple-700 disabled:opacity-50 transition shrink-0 active:scale-95 cursor-pointer"
                      title="Send message"
                    >
                      <Send className="h-4 w-4" />
                    </button>
                  </form>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* ---------------------------------------------------- */}
        {/* 2. TASK AUTOMATIONS TAB                              */}
        {/* ---------------------------------------------------- */}
        {activeTab === 'automations' && (
          <motion.div
            key="automations"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
            className="space-y-6"
          >
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Zap className="h-4 w-4 text-purple-500" />
                    Scheduled Automated Tasks
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Autonomous background jobs configured to scan attendance, enforce grace periods, and audit payroll compliance.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={loadAutomations}
                  className="flex items-center space-x-1.5 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition active:scale-95 cursor-pointer"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>Refresh</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {automations.map((auto) => (
                  <motion.div
                    key={auto.id}
                    whileHover={{ y: -4, scale: 1.01 }}
                    transition={{ type: 'spring', stiffness: 380, damping: 24 }}
                    className="flex flex-col justify-between rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 p-4 transition-colors hover:border-purple-500/50 hover:shadow-lg hover:shadow-purple-950/10 dark:hover:shadow-purple-950/40"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 text-purple-500" />
                          {auto.name}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleToggleAutomation(auto.id, auto.isActive)}
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full transition cursor-pointer ${auto.isActive
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                            }`}
                        >
                          {auto.isActive ? 'Active' : 'Disabled'}
                        </button>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-3">
                        {auto.description}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-slate-200/60 dark:border-slate-800 text-[11px] text-slate-400">
                      <span>Last run: {auto.lastRunAt ? new Date(auto.lastRunAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Never'}</span>
                      <button
                        type="button"
                        onClick={() => handleRunAutomation(auto.id)}
                        disabled={runningTaskId === auto.id}
                        className="inline-flex items-center space-x-1 rounded-lg bg-purple-600 px-2.5 py-1 text-white font-semibold hover:bg-purple-700 disabled:opacity-50 transition active:scale-95 cursor-pointer"
                      >
                        <Play className="h-3 w-3" />
                        <span>{runningTaskId === auto.id ? 'Running...' : 'Run Now'}</span>
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Execution History */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-sm">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3">
                Recent Execution Logs
              </h3>
              <div className="overflow-x-auto">
                <table className="min-w-full text-xs text-left">
                  <thead className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-semibold">
                    <tr>
                      <th className="py-2 px-3">Execution ID</th>
                      <th className="py-2 px-3">Triggered By</th>
                      <th className="py-2 px-3">Status</th>
                      <th className="py-2 px-3">Summary</th>
                      <th className="py-2 px-3">Affected Records</th>
                      <th className="py-2 px-3">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300">
                    {automationHistory.slice(0, 10).map((h) => (
                      <tr key={h.id}>
                        <td className="py-2.5 px-3 font-mono">#{h.id}</td>
                        <td className="py-2.5 px-3">{h.triggeredBy}</td>
                        <td className="py-2.5 px-3">
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400 border border-emerald-500/20">
                            <CheckCircle2 className="h-2.5 w-2.5" />
                            {h.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 max-w-xs truncate">{h.summary}</td>
                        <td className="py-2.5 px-3 font-mono">{h.affectedCount ?? 0}</td>
                        <td className="py-2.5 px-3 text-slate-400">
                          {new Date(h.executedAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                        </td>
                      </tr>
                    ))}
                    {automationHistory.length === 0 && (
                      <tr>
                        <td colSpan={6} className="text-center py-6 text-slate-400">
                          No automation execution logs recorded yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {/* ---------------------------------------------------- */}
        {/* 3. ANOMALY DETECTION TAB                             */}
        {/* ---------------------------------------------------- */}
        {activeTab === 'anomalies' && (
          <motion.div
            key="anomalies"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
            className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-sm relative overflow-hidden"
          >
            {/* High-tech scanning radar beam */}
            {isScanningAnomalies && (
              <motion.div
                initial={{ x: '-100%' }}
                animate={{ x: '100%' }}
                transition={{ repeat: Infinity, duration: 1.4, ease: 'linear' }}
                className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-purple-500 to-transparent pointer-events-none"
              />
            )}

            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  Live Attendance & Payroll Anomaly Scanner
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Continuously audits records for policy violations: punches past 08:30 grace period, missing checkouts, negative pay, or unapproved overtime.
                </p>
              </div>
              <button
                type="button"
                onClick={loadAnomalies}
                disabled={isScanningAnomalies}
                className="flex items-center space-x-1.5 rounded-lg bg-purple-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-purple-700 disabled:opacity-50 transition active:scale-95 cursor-pointer shadow-sm shadow-purple-600/25"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isScanningAnomalies ? 'animate-spin' : ''}`} />
                <span>{isScanningAnomalies ? 'Scanning...' : 'Scan Now'}</span>
              </button>
            </div>

            <div className="space-y-3">
              {anomalies.map((anom, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  whileHover={{ x: 4 }}
                  transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                  className="flex items-start justify-between rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 p-4 hover:border-amber-500/40 transition-colors"
                >
                  <div className="flex items-start space-x-3">
                    <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 mt-0.5">
                      <AlertTriangle className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-xs text-slate-900 dark:text-white">
                          {anom.title}
                        </span>
                        <span className="rounded-full bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 text-[9px] font-bold text-amber-400 uppercase">
                          {anom.severity || 'WARNING'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                        {anom.description}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => alert(`Reviewing anomaly: ${anom.title}`)}
                    className="rounded-lg border border-slate-200 dark:border-slate-700 px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition shrink-0 cursor-pointer"
                  >
                    Review
                  </button>
                </motion.div>
              ))}

              {anomalies.length === 0 && !isScanningAnomalies && (
                <div className="text-center py-12 text-slate-400">
                  <CheckCircle2 className="h-8 w-8 text-emerald-400 mx-auto mb-2 opacity-80" />
                  <p className="text-sm font-semibold text-slate-300">All Systems Compliant</p>
                  <p className="text-xs text-slate-500 mt-1">
                    No attendance, shift reconciliation, or statutory payroll anomalies detected.
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* ---------------------------------------------------- */}
        {/* 4. KNOWLEDGE HUB TAB                                 */}
        {/* ---------------------------------------------------- */}
        {activeTab === 'knowledge' && (
          <motion.div
            key="knowledge"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6"
          >
            {/* Business Rules */}
            <motion.div
              whileHover={{ y: -4 }}
              transition={{ type: 'spring', stiffness: 350, damping: 25 }}
              className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm hover:border-purple-500/40 transition-colors"
            >
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-3">
                <Briefcase className="h-4 w-4 text-purple-500" />
                Sierra Leone Business Rules
              </h3>
              <div className="space-y-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
                  <p className="font-semibold text-slate-900 dark:text-white">Shift & Grace Period</p>
                  <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                    08:00 to 17:00 standard. Check-in between 08:00–08:30 is on-time. At or after 08:30:01 is late.
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
                  <p className="font-semibold text-slate-900 dark:text-white">NASSIT Pension (Act No. 5 of 2001)</p>
                  <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                    5% deducted from employee gross salary; 10% contributed by employer (total 15%).
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
                  <p className="font-semibold text-slate-900 dark:text-white">Overtime Multipliers</p>
                  <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                    1.5x basic hourly rate on working weekdays; 2.0x on weekends and declared statutory public holidays.
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
                  <p className="font-semibold text-slate-900 dark:text-white">CR80 Smart QR Badges</p>
                  <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                    ISO/IEC 7810 ID-1 standard dimensions (53.98 × 85.60 mm) with cryptographic HMAC-SHA256 tokens.
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Database Schema */}
            <motion.div
              whileHover={{ y: -4 }}
              transition={{ type: 'spring', stiffness: 350, damping: 25 }}
              className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm hover:border-indigo-500/40 transition-colors"
            >
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-3">
                <Database className="h-4 w-4 text-indigo-500" />
                PostgreSQL 18 Data Dictionary
              </h3>
              <div className="space-y-2 text-xs">
                {['employees', 'attendance', 'payroll', 'overtime_requests', 'qr_codes', 'departments', 'users', 'roles'].map((t) => (
                  <div
                    key={t}
                    className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 hover:border-indigo-500/30 transition-colors"
                  >
                    <span className="font-mono text-purple-600 dark:text-purple-400 font-semibold">{t}</span>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">PostgreSQL Table</span>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Security & RBAC */}
            <motion.div
              whileHover={{ y: -4 }}
              transition={{ type: 'spring', stiffness: 350, damping: 25 }}
              className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm hover:border-emerald-500/40 transition-colors"
            >
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-3">
                <Shield className="h-4 w-4 text-emerald-500" />
                Security Policies & IDOR Matrix
              </h3>
              <div className="space-y-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
                  <p className="font-semibold text-slate-900 dark:text-white">Strict IDOR Protection</p>
                  <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                    Employees can only access their own personal punch history and payslips. Foreign data access is rejected.
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
                  <p className="font-semibold text-slate-900 dark:text-white">Two-Step Mutation Gates</p>
                  <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                    Batch payroll generation and database reseeding require explicit human confirmation.
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
                  <p className="font-semibold text-slate-900 dark:text-white">Offline Resilience</p>
                  <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                    Deterministic intent engine executes completely locally without third-party API exposure.
                  </p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ---------------------------------------------------- */}
      {/* Full View Modal for Expanded Inspection & PDF/Excel  */}
      {/* ---------------------------------------------------- */}
      <AIFullViewModal
        isOpen={fullViewModal.isOpen}
        onClose={() => setFullViewModal((prev) => ({ ...prev, isOpen: false }))}
        title={fullViewModal.title}
        content={fullViewModal.content}
        timestamp={fullViewModal.timestamp}
        username={user?.username}
      />
    </div>
  );
};
