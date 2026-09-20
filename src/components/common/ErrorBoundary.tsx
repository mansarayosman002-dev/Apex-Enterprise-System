import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, LogOut, ShieldAlert } from 'lucide-react';
import { ApexLogo } from './ApexLogo.tsx';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Apex HRMS Uncaught UI Exception:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleResetAuth = () => {
    try {
      localStorage.removeItem('apex_token');
      sessionStorage.clear();
    } catch {
      // ignore
    }
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4 sm:p-6">
          <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900/90 backdrop-blur-xl p-6 sm:p-8 shadow-2xl text-center space-y-5">
            <div className="flex justify-center mb-2">
              <ApexLogo size="sm" showSubtitle={true} inverted={true} />
            </div>

            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
              <AlertTriangle className="h-7 w-7" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-bold tracking-tight text-white">
                {this.props.fallbackTitle || 'Application Display Interrupted'}
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                A client-side render exception occurred. The application has safely halted to protect system state.
              </p>
            </div>

            {this.state.error && (
              <div className="rounded-xl border border-rose-900/40 bg-rose-950/30 p-3.5 text-left text-xs font-mono text-rose-300 overflow-x-auto max-h-36">
                <p className="font-semibold text-rose-200">Error: {this.state.error.name}</p>
                <p className="text-rose-300/90 mt-1">{this.state.error.message}</p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-semibold text-white shadow-md shadow-indigo-600/30 hover:bg-indigo-500 transition active:scale-95"
              >
                <RefreshCw className="h-4 w-4" />
                <span>Reload System</span>
              </button>

              <button
                type="button"
                onClick={this.handleResetAuth}
                className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-2.5 text-xs font-semibold text-slate-300 hover:bg-slate-700 hover:text-white transition active:scale-95"
              >
                <LogOut className="h-4 w-4" />
                <span>Reset & Sign In</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
