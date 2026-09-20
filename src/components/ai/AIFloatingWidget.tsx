import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  MessageSquare,
  X,
  Send,
  Maximize2,
  Minimize2,
  Trash2,
  AlertCircle,
  ExternalLink,
  GripVertical,
  Move,
  RotateCcw,
} from 'lucide-react';
import { AIAssistantLogo } from './AIAssistantLogo.tsx';
import { AIMessageActionToolbar } from './AIMessageActionToolbar.tsx';
import { AIFullViewModal } from './AIFullViewModal.tsx';
import { AIMarkdownRenderer } from './AIMarkdownRenderer.tsx';
import { UserAvatar } from '../common/UserAvatar.tsx';
import { api } from '../../services/api.ts';
import { useAuth } from '../../context/AuthContext.tsx';

interface AIFloatingWidgetProps {
  activePage?: string;
  onNavigateToAIPage?: () => void;
}

interface WidgetMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export const AIFloatingWidget: React.FC<AIFloatingWidgetProps> = ({
  activePage = 'dashboard',
  onNavigateToAIPage,
}) => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<number | undefined>(undefined);
  const [messages, setMessages] = useState<WidgetMessage[]>([
    {
      id: 'init-1',
      role: 'assistant',
      content:
        'Hello! How can I assist you with attendance, payroll, or staff records today?',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  // Full View Modal state
  const [fullViewData, setFullViewData] = useState<{
    isOpen: boolean;
    title: string;
    content: string;
    timestamp?: string;
  }>({
    isOpen: false,
    title: '',
    content: '',
  });

  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Draggable movement state (both collapsed orb and expanded card)
  // Draggable movement state (both collapsed orb and expanded card)
  const [position, setPosition] = useState<{ x: number; y: number } | null>(() => {
    try {
      const saved = localStorage.getItem('apex_ai_widget_pos');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
          return {
            x: Math.min(Math.max(parsed.x, 10), Math.max(10, window.innerWidth - 80)),
            y: Math.min(Math.max(parsed.y, 10), Math.max(10, window.innerHeight - 80)),
          };
        }
      }
    } catch {
      // fallback
    }
    return null;
  });

  const [isDragging, setIsDragging] = useState(false);
  const collapsedRef = useRef<HTMLDivElement>(null);
  const expandedRef = useRef<HTMLDivElement>(null);

  // Reset to default corner dock
  const handleResetPosition = () => {
    setPosition(null);
    try {
      localStorage.removeItem('apex_ai_widget_pos');
    } catch {
      // ignore
    }
  };

  // Drag handler for Collapsed Trigger Orb
  const handleCollapsedPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;

    const target = e.currentTarget;
    try {
      target.setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }

    const startX = e.clientX;
    const startY = e.clientY;
    const rect = target.getBoundingClientRect();
    const initialLeft = rect.left;
    const initialTop = rect.top;

    let hasMoved = false;
    let currentX = initialLeft;
    let currentY = initialTop;

    const onPointerMove = (moveEvent: PointerEvent) => {
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;

      if (!hasMoved && Math.hypot(dx, dy) > 4) {
        hasMoved = true;
        setIsDragging(true);
      }

      if (hasMoved) {
        const margin = 10;
        const width = rect.width || 64;
        const height = rect.height || 64;
        const minX = margin;
        const maxX = Math.max(margin, window.innerWidth - width - margin);
        const minY = margin;
        const bottomNavOffset = window.innerWidth < 768 ? 74 : margin;
        const maxY = Math.max(margin, window.innerHeight - height - bottomNavOffset);

        currentX = Math.min(Math.max(initialLeft + dx, minX), maxX);
        currentY = Math.min(Math.max(initialTop + dy, minY), maxY);

        setPosition({ x: currentX, y: currentY });
      }
    };

    const onPointerUp = (upEvent: PointerEvent) => {
      try {
        if (target.hasPointerCapture(upEvent.pointerId)) {
          target.releasePointerCapture(upEvent.pointerId);
        }
      } catch {
        // ignore
      }

      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);

      setIsDragging(false);

      if (!hasMoved) {
        // Pure click: open the assistant
        setIsOpen(true);
        setIsMinimized(false);
      } else {
        // Save dragged position
        try {
          localStorage.setItem('apex_ai_widget_pos', JSON.stringify({ x: currentX, y: currentY }));
        } catch {
          // ignore
        }
      }
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
  };

  // Drag handler for Expanded Card Header
  const handleHeaderPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    if ((e.target as HTMLElement).closest('button, input, textarea, a')) {
      return;
    }

    const card = expandedRef.current;
    if (!card) return;

    const target = e.currentTarget;
    try {
      target.setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }

    const startX = e.clientX;
    const startY = e.clientY;
    const rect = card.getBoundingClientRect();
    const initialLeft = rect.left;
    const initialTop = rect.top;

    let hasMoved = false;
    let currentX = initialLeft;
    let currentY = initialTop;

    const onPointerMove = (moveEvent: PointerEvent) => {
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;

      if (!hasMoved && Math.hypot(dx, dy) > 4) {
        hasMoved = true;
        setIsDragging(true);
      }

      if (hasMoved) {
        const margin = 10;
        const width = card.offsetWidth || 400;
        const height = card.offsetHeight || 560;
        const minX = margin;
        const maxX = Math.max(margin, window.innerWidth - width - margin);
        const minY = margin;
        const bottomNavOffset = window.innerWidth < 768 ? 74 : margin;
        const maxY = Math.max(margin, window.innerHeight - height - bottomNavOffset);

        currentX = Math.min(Math.max(initialLeft + dx, minX), maxX);
        currentY = Math.min(Math.max(initialTop + dy, minY), maxY);

        setPosition({ x: currentX, y: currentY });
      }
    };

    const onPointerUp = (upEvent: PointerEvent) => {
      try {
        if (target.hasPointerCapture(upEvent.pointerId)) {
          target.releasePointerCapture(upEvent.pointerId);
        }
      } catch {
        // ignore
      }

      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);

      setIsDragging(false);

      if (hasMoved) {
        try {
          localStorage.setItem('apex_ai_widget_pos', JSON.stringify({ x: currentX, y: currentY }));
        } catch {
          // ignore
        }
      }
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
  };

  // Re-clamp position within viewport boundaries on window resize
  useEffect(() => {
    if (!position) return;
    const handleResize = () => {
      const isMobile = window.innerWidth < 768;
      const bottomNavOffset = isMobile ? 74 : 10;
      const width = isOpen ? (isMinimized ? 288 : Math.min(window.innerWidth - 30, 410)) : 64;
      const height = isOpen ? (isMinimized ? 56 : Math.min(window.innerHeight - 56, 580)) : 64;
      const maxX = Math.max(10, window.innerWidth - width - 10);
      const maxY = Math.max(10, window.innerHeight - height - bottomNavOffset);

      setPosition((prev) => {
        if (!prev) return null;
        return {
          x: Math.min(Math.max(prev.x, 10), maxX),
          y: Math.min(Math.max(prev.y, 10), maxY),
        };
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [position, isOpen, isMinimized]);

  // Ensure card stays on screen when expanding from collapsed
  useEffect(() => {
    if (isOpen && position) {
      const width = isMinimized ? 288 : Math.min(window.innerWidth - 40, 410);
      const height = isMinimized ? 56 : Math.min(window.innerHeight - 56, 580);
      const maxX = Math.max(10, window.innerWidth - width - 10);
      const maxY = Math.max(10, window.innerHeight - height - 10);

      if (position.x > maxX || position.y > maxY) {
        setPosition({
          x: Math.min(position.x, maxX),
          y: Math.min(position.y, maxY),
        });
      }
    }
  }, [isOpen, isMinimized]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (isOpen && !isMinimized) {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isMinimized]);

  if (!user) return null;

  // Context-sensitive prompt suggestions based on current active page
  const getContextPrompts = (): Array<{ label: string; query: string }> => {
    switch (activePage) {
      case 'attendance':
        return [
          { label: 'Late Today', query: 'Who arrived late today?' },
          { label: 'Grace Period', query: 'What is the 08:30 grace period rule?' },
          { label: 'Overtime 1.5x', query: 'How is overtime 1.5x calculated?' },
        ];
      case 'payroll':
        return [
          { label: 'NASSIT Pension', query: 'Explain NASSIT 5% & 10% pension deductions' },
          { label: 'PAYE Brackets', query: 'What are the Sierra Leone PAYE tax brackets?' },
          { label: 'Anomalies', query: 'Are there any payroll calculation anomalies?' },
        ];
      case 'employees':
        return [
          { label: 'Headcount', query: 'Show department headcount distribution' },
          { label: 'QR Badges', query: 'What are the CR80 QR badge specifications?' },
          { label: 'Active Staff', query: 'List employees active in the system' },
        ];
      case 'departments':
        return [
          { label: 'Staff Count', query: 'Which department has the highest headcount?' },
          { label: 'Shift Roster', query: 'Summarize working shifts by department' },
        ];
      case 'reports':
        return [
          { label: 'Punctuality', query: 'Summarize weekly attendance punctuality digest' },
          { label: 'Compliance', query: 'Generate executive compliance overview' },
        ];
      default:
        return [
          { label: 'Late Today', query: 'Who is late today?' },
          { label: 'NASSIT & PAYE', query: 'Explain NASSIT & PAYE statutory rules' },
          { label: 'Working Hours', query: 'What are official company working hours?' },
        ];
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || loading) return;

    const userMsg: WidgetMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage('');
    setLoading(true);

    try {
      const response = await api.aiChat(text, conversationId);
      if (response.conversationId) {
        setConversationId(response.conversationId);
      }

      const assistantMsg: WidgetMessage = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: response.message,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      const errorMsg: WidgetMessage = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: `**Error**: ${err.message || 'Unable to connect to AI engine. Please check backend connection.'}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: 'init-reset',
        role: 'assistant',
        content: 'Conversation reset. How can I help you with Apex HRMS today?',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
    setConversationId(undefined);
  };

  return (
    <>
      {/* 1. Collapsed Floating Trigger Button (Draggable anywhere on screen) */}
      <AnimatePresence>
        {!isOpen && (
          <motion.div
            key="collapsed-ai-trigger"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ type: 'spring', stiffness: 450, damping: 26 }}
            ref={collapsedRef}
            onPointerDown={handleCollapsedPointerDown}
            style={
              position
                ? {
                  left: `${position.x}px`,
                  top: `${position.y}px`,
                  bottom: 'auto',
                  right: 'auto',
                }
                : undefined
            }
            className={`fixed ${!position ? 'bottom-20 right-4 md:bottom-6 md:right-6' : ''} z-40 flex items-center group touch-none select-none cursor-grab active:cursor-grabbing ${isDragging ? 'transition-none scale-105 shadow-2xl' : 'transition-transform duration-200 hover:scale-105'
              }`}
            title="Apex AI Copilot • Click to chat, Drag to move anywhere"
          >
            <div className="relative flex items-center justify-center p-1 rounded-full shadow-2xl shadow-purple-950/30 dark:shadow-purple-950/80 focus:outline-none">
              {/* Outer pulsating glow ring */}
              <span className="absolute -inset-1.5 rounded-full bg-gradient-to-tr from-purple-600 via-fuchsia-500 to-indigo-500 opacity-70 blur-md animate-pulse pointer-events-none" />

              {/* Glowing Amethyst Orb Logo */}
              <AIAssistantLogo size="lg" withGlow={false} showBadge={true} />

              {/* Move indicator badge */}
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-purple-600 border border-purple-300/40 text-white shadow-xs opacity-75 group-hover:opacity-100 transition-opacity pointer-events-none">
                <Move className="h-2.5 w-2.5" />
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. Expanded Floating Popover Card (Supports Light & Dark Modes) */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="expanded-ai-popover"
            initial={{ opacity: 0, scale: 0.94, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 12 }}
            transition={{ type: 'spring', stiffness: 420, damping: 28 }}
            ref={expandedRef}
            style={
              position
                ? {
                  left: `${position.x}px`,
                  top: `${position.y}px`,
                  bottom: 'auto',
                  right: 'auto',
                }
                : undefined
            }
            className={`fixed ${!position ? 'bottom-20 right-2 sm:bottom-5 sm:right-5' : ''} z-50 flex flex-col rounded-2xl border border-purple-300/80 dark:border-purple-500/30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl shadow-2xl shadow-purple-950/15 dark:shadow-purple-950/60 overflow-hidden ${isDragging ? 'transition-none select-none shadow-purple-950/40' : 'transition-all duration-300'
              } ${isMinimized
                ? 'w-72 h-14'
                : 'w-[calc(100vw-1rem)] sm:w-[410px] h-[580px] max-h-[calc(100vh-6rem)] sm:max-h-[calc(100vh-3.5rem)]'
              }`}
          >
            {/* Header Bar - Draggable handle */}
            <div
              onPointerDown={handleHeaderPointerDown}
              className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-slate-50/95 dark:bg-slate-950/80 px-3 sm:px-4 py-2.5 sm:py-3 shrink-0 cursor-grab active:cursor-grabbing select-none touch-none"
              title="Apex AI Copilot • Drag header to move widget anywhere"
            >
              <div className="flex items-center space-x-2">
                <span className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 cursor-grab active:cursor-grabbing">
                  <GripVertical className="h-4 w-4" />
                </span>
                <AIAssistantLogo size="sm" withGlow={true} />
                <div>
                  <div className="flex items-center space-x-1.5">
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">Apex AI Copilot</h3>
                    <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-emerald-200 dark:ring-emerald-950" />
                  </div>
                  {!isMinimized && (
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">Online • Drag to move</p>
                  )}
                </div>
              </div>

              <div
                className="flex items-center space-x-1"
                onPointerDown={(e) => e.stopPropagation()}
              >
                {/* Reset to corner dock button */}
                {position && (
                  <button
                    type="button"
                    onClick={handleResetPosition}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-purple-600 dark:hover:text-purple-300 transition cursor-pointer"
                    title="Reset to default bottom-right dock"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                  </button>
                )}

                {/* Navigate to Full Page */}
                {onNavigateToAIPage && !isMinimized && (
                  <button
                    type="button"
                    onClick={() => {
                      onNavigateToAIPage();
                      setIsOpen(false);
                    }}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-purple-600 dark:hover:text-purple-300 transition cursor-pointer"
                    title="Open Dedicated Full Page"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </button>
                )}

                {/* Minimize / Expand Toggle */}
                <button
                  type="button"
                  onClick={() => setIsMinimized(!isMinimized)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-white transition cursor-pointer"
                  title={isMinimized ? 'Expand' : 'Minimize'}
                >
                  {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
                </button>

                {/* Close Button */}
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-100 dark:hover:bg-slate-800 hover:text-rose-600 dark:hover:text-rose-400 transition cursor-pointer"
                  title="Close AI Copilot"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Body Content (Shown only when not minimized) */}
            {!isMinimized && (
              <>
                {/* Context Prompt Suggestions (Minimized & without horizontal scrollbar) */}
                <div className="border-b border-slate-200 dark:border-slate-800/60 bg-slate-100/70 dark:bg-slate-950/40 px-3 py-1.5 shrink-0">
                  <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                    <div className="flex items-center space-x-1.5">
                      <span className="font-semibold text-purple-700 dark:text-purple-300 text-[10px]">
                        Suggestions
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowSuggestions((prev) => !prev)}
                        className="text-[10px] text-slate-400 dark:text-slate-500 hover:text-purple-600 dark:hover:text-purple-300 transition underline underline-offset-2"
                        title={showSuggestions ? 'Minimize suggestions' : 'Expand suggestions'}
                      >
                        {showSuggestions ? 'minimize' : 'expand'}
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={handleClearChat}
                      className="flex items-center gap-1 text-[10px] text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition cursor-pointer"
                      title="Reset Chat"
                    >
                      <Trash2 className="h-2.5 w-2.5" />
                      <span>Clear</span>
                    </button>
                  </div>
                  {showSuggestions && (
                    <div className="flex flex-wrap items-center gap-1.5 overflow-x-hidden">
                      {getContextPrompts().map((p, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleSendMessage(p.query)}
                          className="rounded-full border border-purple-200 dark:border-purple-500/20 bg-purple-50 dark:bg-purple-950/30 px-2 py-0.5 text-[10px] font-medium text-purple-700 dark:text-purple-200 hover:bg-purple-100 dark:hover:bg-purple-900/50 hover:border-purple-300 dark:hover:border-purple-500/40 transition active:scale-95 whitespace-nowrap cursor-pointer"
                          title={p.query}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Chat Messages Stream */}
                <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-slate-50/40 dark:bg-transparent">
                  {messages.map((m) => {
                    const isUser = m.role === 'user';
                    return (
                      <motion.div
                        key={m.id}
                        initial={{ opacity: 0, y: 8, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                        className={`flex gap-2.5 ${isUser ? 'justify-end' : 'justify-start'}`}
                      >
                        {!isUser && <AIAssistantLogo size="xs" withGlow={false} className="mt-0.5 shrink-0" />}

                        <div
                          className={`max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed shadow-xs ${isUser
                            ? 'bg-purple-600 text-white rounded-br-sm'
                            : 'bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 text-slate-800 dark:text-slate-200 rounded-tl-sm'
                            }`}
                        >
                          <AIMarkdownRenderer content={m.content} isUser={isUser} />

                          {/* If Assistant Message, render Action Toolbar with Full View, PDF, Excel, Share */}
                          {!isUser && m.id !== 'init-1' && m.id !== 'init-reset' && (
                            <AIMessageActionToolbar
                              content={m.content}
                              title="Apex AI Copilot Response"
                              username={user?.username}
                              compact={true}
                              onOpenFullView={() =>
                                setFullViewData({
                                  isOpen: true,
                                  title: 'Apex AI Copilot Response',
                                  content: m.content,
                                  timestamp: m.timestamp,
                                })
                              }
                            />
                          )}

                          <span
                            className={`block text-[9px] mt-1.5 ${isUser ? 'text-purple-200/70 text-right' : 'text-slate-400 dark:text-slate-500'
                              }`}
                          >
                            {m.timestamp}
                          </span>
                        </div>

                        {isUser && (
                          <div className="shrink-0 mt-0.5">
                            <UserAvatar user={user} size="xs" />
                          </div>
                        )}
                      </motion.div>
                    );
                  })}

                  {loading && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="flex items-center space-x-2 text-xs text-purple-700 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/30 rounded-xl p-3 w-fit animate-pulse"
                    >
                      <AIAssistantLogo size="xs" withGlow={false} />
                      <span>Analyzing system records & business rules...</span>
                    </motion.div>
                  )}
                  <div ref={chatBottomRef} />
                </div>

                {/* Chat Input Bar */}
                <div className="border-t border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-950/90 p-2.5 shrink-0">
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
                      disabled={loading}
                      className="flex-1 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3.5 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:border-purple-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-purple-500"
                    />
                    <button
                      type="submit"
                      disabled={!inputMessage.trim() || loading}
                      className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-600/30 transition hover:from-purple-500 hover:to-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 cursor-pointer"
                      title="Send message"
                    >
                      <Send className="h-3.5 w-3.5" />
                    </button>
                  </form>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3. Full View Modal if triggered from any floating widget message */}
      <AIFullViewModal
        isOpen={fullViewData.isOpen}
        onClose={() => setFullViewData((prev) => ({ ...prev, isOpen: false }))}
        title={fullViewData.title}
        content={fullViewData.content}
        timestamp={fullViewData.timestamp}
        username={user?.username}
      />
    </>
  );
};
