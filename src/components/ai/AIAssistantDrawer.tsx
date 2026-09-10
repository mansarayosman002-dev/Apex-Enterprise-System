import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { api, getStoredToken } from '../../services/api.ts';
import {
  Sparkles,
  X,
  Send,
  Bot,
  User,
  AlertTriangle,
  CheckCircle2,
  Copy,
  Check,
  Maximize2,
  Trash2,
  ShieldCheck,
  LogIn,
  ArrowUp,
  Plus,
  Clock,
  DollarSign,
  Building2,
  ShieldAlert,
} from 'lucide-react';
import { AIMessageRenderer } from './AIMessageRenderer.tsx';
import { AIMessageActions } from './AIMessageActions.tsx';
import { AIFullViewModal } from './AIFullViewModal.tsx';
import { AIShareModal } from './AIShareModal.tsx';

interface ChatMessage {
  id?: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  requiresConfirmation?: boolean;
  pendingAction?: {
    toolName: string;
    arguments: Record<string, any>;
    prompt?: string;
    previewText?: string;
    actionId?: string;
  };
}

interface AIAssistantDrawerProps {
  onOpenHub?: () => void;
}

export const AIAssistantDrawer: React.FC<AIAssistantDrawerProps> = ({ onOpenHub }) => {
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<number | undefined>();
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [fullViewContent, setFullViewContent] = useState<string | null>(null);
  const [shareContent, setShareContent] = useState<string | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingText, setEditingText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  // Dynamic greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const displayName = user?.employee?.firstName || user?.username || 'Colleague';

  const getRolePromptPills = () => {
    const role = user?.roleName;
    switch (role) {
      case 'Administrator':
        return [
          "Today's attendance summary",
          'Who is late today?',
          'Who is absent today?',
          'Overall payroll summary',
          'Check for anomalies',
        ];
      case 'HR Officer':
        return [
          'Who is late today?',
          'Who is absent today?',
          "Today's attendance report",
          'Department headcount summary',
          'Attendance anomalies',
        ];
      case 'Payroll Officer':
        return [
          'Current payroll summary',
          'Overtime records summary',
          'Sierra Leone NASSIT rates',
          'PAYE progressive tax brackets',
        ];
      case 'Management':
        return [
          "Today's attendance overview",
          'Total payroll cost this month',
          'Department staff counts',
          'Overtime hours summary',
        ];
      case 'Employee':
      default:
        return [
          'Show my attendance history',
          'Show my latest payslip',
          'How is Net Salary calculated?',
          'What are NASSIT deductions?',
          'Who am I?',
        ];
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query || isLoading) return;

    const userMsg: ChatMessage = { role: 'user', content: query };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const data = await api.aiChat({
        message: query,
        conversationId,
      });

      if (data.conversationId) {
        setConversationId(data.conversationId);
      }

      const assistantMsg: ChatMessage = {
        role: 'assistant',
        content: data.message || 'No response content returned.',
        requiresConfirmation: data.requiresConfirmation,
        pendingAction: data.pendingAction,
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      const isAuth = err.message?.includes('expired') || err.message?.includes('session') || err.message?.includes('401') || err.message?.includes('token');
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: isAuth
            ? `**Session Expired**: Your login session has timed out or is invalid. Please log in again to continue.`
            : `**Error**: ${err.message || 'Unable to connect to AI engine.'}`,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmAction = async (action: { toolName: string; arguments: Record<string, any> }) => {
    setIsLoading(true);
    try {
      const data = await api.aiChat({
        conversationId,
        confirmedAction: action,
      });

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: data.message,
        },
      ]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `**Execution Error**: ${err.message}`,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (content: string, index: number) => {
    navigator.clipboard.writeText(content);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleClearChat = () => {
    setMessages([]);
    setConversationId(undefined);
    setInput('');
    setEditingIndex(null);
  };

  return (
    <>
      {/* Floating Toggle Button */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="fixed bottom-20 md:bottom-6 right-3 sm:right-6 z-40 flex items-center space-x-2 rounded-full bg-linear-to-r from-indigo-600 via-purple-600 to-indigo-700 px-3.5 py-2.5 sm:px-4 sm:py-3 text-white shadow-2xl hover:scale-105 active:scale-95 transition-all duration-200 hover:shadow-indigo-500/30 group cursor-pointer"
          title="Open AI HR & Payroll Assistant"
        >
          <div className="relative">
            <img src="/apex-copilot-logo.png" alt="AI Assistant" className="h-5 w-5 rounded-full object-cover ring-1.5 ring-amber-300 shadow-xs" />
            <span className="absolute -top-1 -right-1 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
          </div>
          <span className="text-xs font-bold tracking-wide">AI Assistant</span>
        </button>
      )}

      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-xs md:hidden"
        />
      )}

      {/* Slide-over Drawer */}
      {isOpen && (
        <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl animate-in slide-in-from-right duration-300">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-4 py-3 bg-linear-to-r from-purple-500/10 via-indigo-500/10 to-transparent">
            <div className="flex items-center space-x-2.5">
              <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800/80 text-[11px] font-bold text-purple-700 dark:text-purple-300">
                <img src="/apex-copilot-logo.png" alt="Apex Copilot" className="h-3.5 w-3.5 rounded-full object-cover" />
                <span>Apex Copilot 2.5</span>
              </span>
              <span className="flex h-2 w-2 rounded-full bg-emerald-500" title="Online & Connected"></span>
            </div>

            <div className="flex items-center space-x-1.5">
              <button
                type="button"
                onClick={handleClearChat}
                className="flex items-center space-x-1 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-2.5 py-1 text-[11px] font-bold hover:bg-slate-800 dark:hover:bg-slate-100 transition shadow-2xs cursor-pointer"
                title="Start a fresh conversation thread"
              >
                <Plus className="h-3 w-3" />
                <span>New Thread</span>
              </button>
              {onOpenHub && (
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    onOpenHub();
                  }}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-200 transition"
                  title="Open Full AI Copilot Hub"
                >
                  <Maximize2 className="h-4 w-4" />
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-200 transition"
                title="Close Drawer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Quick Prompt Suggestion Pills */}
          <div className="flex items-center space-x-2 overflow-x-auto p-2.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 scrollbar-none text-[11px]">
            {getRolePromptPills().map((pill, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSendMessage(pill)}
                className="shrink-0 rounded-full border border-purple-200 dark:border-purple-800/60 bg-white dark:bg-slate-800/80 px-2.5 py-1 text-slate-700 dark:text-slate-300 shadow-2xs hover:bg-purple-50 dark:hover:bg-purple-950/40 hover:text-purple-600 dark:hover:text-purple-400 transition cursor-pointer"
              >
                {pill}
              </button>
            ))}
          </div>

          {/* Messages Feed / Hero View */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
            {messages.length === 0 ? (
              <div className="py-4 flex flex-col items-center justify-center animate-in fade-in duration-300 text-center">
                {/* 3D Iridescent Fluid Orb Logo */}
                <div className="relative my-3 flex items-center justify-center">
                  <div className="absolute h-20 w-20 rounded-full bg-gradient-to-tr from-fuchsia-600 via-purple-600 to-indigo-600 blur-xl opacity-60 animate-pulse" />
                  <div className="relative h-16 w-16 rounded-full bg-gradient-to-tr from-indigo-700 via-purple-600 to-fuchsia-400 p-0.5 shadow-xl shadow-purple-500/30">
                    <img
                      src="/apex-copilot-logo.png"
                      alt="Apex Copilot"
                      className="h-full w-full rounded-full object-cover shadow-inner"
                    />
                  </div>
                </div>

                {/* Greeting & Prompt Headline */}
                <div className="space-y-1 mb-5">
                  <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                    {getGreeting()}, <span className="font-bold">{displayName}</span>
                  </h3>
                  <p className="text-sm font-normal text-slate-600 dark:text-slate-300">
                    What insights do you need for your{' '}
                    <span className="font-semibold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 via-fuchsia-500 to-indigo-600 dark:from-purple-400 dark:to-indigo-300">
                      workforce today ?
                    </span>
                  </p>
                </div>

                {/* 4 Cards Grid */}
                <p className="text-[10px] font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase mb-2.5">
                  GET STARTED WITH A WORKFORCE QUERY
                </p>
                <div className="grid grid-cols-2 gap-2.5 w-full text-left">
                  {[
                    {
                      title: "Today's Tardiness",
                      desc: 'Check late arrivals past shift start',
                      query: 'Who reported late today and what is their delay time?',
                      icon: Clock,
                    },
                    {
                      title: 'Payroll Summary',
                      desc: 'Net salaries and overtime costs',
                      query: 'Show current payroll distribution and net disbursement summary',
                      icon: DollarSign,
                    },
                    {
                      title: 'Apex Profile',
                      desc: 'Services and smart attendance',
                      query: 'Tell me about Apex Enterprise SL Ltd, its services, and how the system works',
                      icon: Building2,
                    },
                    {
                      title: 'Anomaly Scan',
                      desc: 'Scan duplicate records & fraud',
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
                        className="group flex flex-col justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/80 hover:border-purple-400 dark:hover:border-purple-500 hover:shadow-xs transition duration-200 text-left cursor-pointer h-28"
                      >
                        <div>
                          <p className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition leading-tight">
                            {card.title}
                          </p>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-tight">
                            {card.desc}
                          </p>
                        </div>
                        <div className="pt-2">
                          <Icon className="h-4 w-4 text-slate-400 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition" />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              messages.map((msg, index) => (
              <div
                key={index}
                className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'assistant' && (
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg overflow-hidden border border-purple-400/40 shadow-xs">
                    <img src="/apex-copilot-logo.png" alt="Apex Copilot" className="h-full w-full object-cover" />
                  </div>
                )}

                <div
                  className={`relative rounded-2xl p-3.5 text-xs leading-relaxed ${
                    msg.role === 'user'
                      ? 'max-w-[80%] bg-indigo-600 text-white rounded-tr-xs shadow-xs'
                      : 'max-w-[94%] bg-slate-100 dark:bg-slate-800/80 text-slate-800 dark:text-slate-200 rounded-tl-xs border border-slate-200/70 dark:border-slate-700/60 shadow-2xs'
                  }`}
                >
                  {/* Beautiful Structured AI Message Output or Inline Editor */}
                  {editingIndex === index ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 dark:text-slate-300">
                        <span>Edit AI Response</span>
                        <span className="text-[10px] text-slate-400">Refine summary or notification text</span>
                      </div>
                      <textarea
                        value={editingText}
                        onChange={(e) => setEditingText(e.target.value)}
                        rows={7}
                        className="w-full rounded-xl border border-indigo-300 dark:border-indigo-700 bg-white dark:bg-slate-900 p-2.5 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                      />
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          type="button"
                          onClick={() => setEditingIndex(null)}
                          className="rounded-lg px-2.5 py-1 text-[11px] font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setMessages((prev) => {
                              const copy = [...prev];
                              copy[index] = { ...copy[index], content: editingText };
                              return copy;
                            });
                            setEditingIndex(null);
                          }}
                          className="rounded-lg bg-indigo-600 px-3 py-1 text-[11px] font-bold text-white hover:bg-indigo-700 transition shadow-xs"
                        >
                          Save Changes
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <AIMessageRenderer content={msg.content} />

                      {/* 5 Response Features Action Bar */}
                      {msg.role === 'assistant' && (
                        <AIMessageActions
                          content={msg.content}
                          onStartEdit={() => {
                            setEditingIndex(index);
                            setEditingText(msg.content);
                          }}
                          onFullView={() => setFullViewContent(msg.content)}
                          onShare={() => setShareContent(msg.content)}
                        />
                      )}
                    </>
                  )}

                  {/* Session Expiry Action */}
                  {msg.role === 'assistant' && (msg.content.includes('Session Expired') || msg.content.includes('log in again')) && (
                    <div className="mt-2.5 pt-2 border-t border-slate-200 dark:border-slate-700">
                      <button
                        type="button"
                        onClick={() => logout()}
                        className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-[11px] transition shadow-xs"
                      >
                        <LogIn className="h-3.5 w-3.5" />
                        <span>Log In Again</span>
                      </button>
                    </div>
                  )}

                  {/* Pending Confirmation Box */}
                  {msg.requiresConfirmation && msg.pendingAction && (
                    <div className="mt-3 rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40 p-3 text-amber-900 dark:text-amber-200">
                      <div className="flex items-center space-x-1.5 font-bold mb-1">
                        <AlertTriangle className="h-4 w-4 text-amber-600" />
                        <span>Confirmation Required</span>
                      </div>
                      <p className="text-[11px] mb-2">{msg.pendingAction.prompt}</p>
                      <div className="flex items-center space-x-2">
                        <button
                          type="button"
                          onClick={() => handleConfirmAction(msg.pendingAction!)}
                          disabled={isLoading}
                          className="flex items-center space-x-1 rounded-lg bg-amber-600 hover:bg-amber-700 px-3 py-1.5 text-[11px] font-bold text-white shadow-xs transition"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>Confirm & Execute</span>
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setMessages((prev) => [
                              ...prev,
                              { role: 'assistant', content: 'Operation was cancelled by the user.' },
                            ])
                          }
                          className="rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-1.5 text-[11px] font-medium text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 transition"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {msg.role === 'user' && (
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                    <User className="h-4 w-4" />
                  </div>
                )}
              </div>
            ))
          )}

            {/* Loading Indicator */}
            {isLoading && (
              <div className="flex items-center space-x-2 text-slate-400 text-xs py-2">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg overflow-hidden border border-purple-400/40 shadow-xs">
                  <img src="/apex-copilot-logo.png" alt="Apex Copilot" className="h-full w-full object-cover animate-pulse" />
                </div>
                <div className="flex items-center space-x-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 px-3 py-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-indigo-600 animate-bounce"></span>
                  <span className="h-1.5 w-1.5 rounded-full bg-indigo-600 animate-bounce delay-100"></span>
                  <span className="h-1.5 w-1.5 rounded-full bg-indigo-600 animate-bounce delay-200"></span>
                  <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 ml-1">Analyzing...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="border-t border-slate-200 dark:border-slate-800 p-3 bg-white dark:bg-slate-900">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center space-x-2 rounded-2xl border border-slate-200 dark:border-slate-700/80 bg-slate-50 dark:bg-slate-800/90 p-1.5 focus-within:border-purple-500/80 focus-within:ring-2 focus-within:ring-purple-500/20 transition"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={`Ask ${user?.roleName === 'Employee' ? 'about your payslip or attendance' : 'Copilot a workforce query'}...`}
                disabled={isLoading}
                className="flex-1 bg-transparent px-3 py-1.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none"
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="h-8 w-8 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-slate-900 dark:disabled:hover:bg-white transition flex items-center justify-center shadow-xs cursor-pointer"
                title="Send message"
              >
                <ArrowUp className="h-4 w-4 font-bold" />
              </button>
            </form>
            <div className="mt-1.5 flex items-center justify-center space-x-1.5 text-[10px] text-slate-400 dark:text-slate-500">
              <ShieldCheck className="h-3 w-3 text-purple-600 dark:text-purple-400" />
              <span>Enterprise RBAC and data isolation strictly enforced</span>
            </div>
          </div>
        </div>
      )}

      {/* Response Full View Modal */}
      <AIFullViewModal
        isOpen={Boolean(fullViewContent)}
        onClose={() => setFullViewContent(null)}
        content={fullViewContent || ''}
        onShare={() => {
          setShareContent(fullViewContent);
          setFullViewContent(null);
        }}
      />

      {/* Response Share Modal */}
      <AIShareModal
        isOpen={Boolean(shareContent)}
        onClose={() => setShareContent(null)}
        messageContent={shareContent || ''}
      />
    </>
  );
};
