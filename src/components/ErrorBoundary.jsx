import React from 'react';
import { RefreshCw, Home, AlertTriangle, ChefHat } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null 
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    console.error('CRITICAL APP ERROR CAUGHT BY BOUNDARY:', error, errorInfo);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  handleGoHome = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-[#FFFDF9] flex flex-col justify-center items-center px-6 py-12 font-sans relative overflow-hidden text-center">
          {/* Ambient Warm Heritage Glow */}
          <div className="absolute top-10 right-10 w-96 h-96 bg-[#ec6d13]/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-10 left-10 w-96 h-96 bg-[#f4c430]/15 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 max-w-md w-full bg-white/95 backdrop-blur-xl border border-slate-100 rounded-[32px] p-8 sm:p-10 shadow-2xl shadow-slate-900/5 space-y-6">
            <div className="w-16 h-16 bg-gradient-to-tr from-[#ec6d13] to-[#f4c430] rounded-3xl flex items-center justify-center text-white mx-auto shadow-xl saffron-glow">
              <ChefHat size={32} />
            </div>

            <div className="space-y-2">
              <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest bg-rose-50 border border-rose-100 px-3 py-1 rounded-full inline-block">
                Kitchen Hiccup Detected
              </span>
              <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">
                The Feast is Paused
              </h1>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">
                An unexpected recipe glitch occurred. Don't worry, your cart and session data are safely stored.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-3 pt-2">
              <button
                onClick={this.handleReload}
                className="w-full bg-[#ec6d13] text-white py-3.5 px-6 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 saffron-glow hover:bg-[#d35400] transition-colors active:scale-95 shadow-lg shadow-[#ec6d13]/25"
              >
                <RefreshCw size={16} />
                <span>Reload Kitchen</span>
              </button>

              <button
                onClick={this.handleGoHome}
                className="w-full bg-slate-100 text-slate-700 py-3.5 px-6 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-slate-200 transition-colors active:scale-95"
              >
                <Home size={16} />
                <span>Return to Menu</span>
              </button>
            </div>

            {/* Collapsible Error Info for Developers */}
            {process.env.NODE_ENV !== 'production' && this.state.error && (
              <details className="text-left bg-slate-50 p-3 rounded-2xl border border-slate-200/80 text-[10px] text-slate-600 overflow-hidden">
                <summary className="font-bold text-slate-800 cursor-pointer select-none">
                  Technical Trace (Development Mode)
                </summary>
                <p className="font-mono text-rose-600 mt-2 break-all">
                  {this.state.error.toString()}
                </p>
                {this.state.errorInfo && (
                  <pre className="mt-2 text-[9px] font-mono text-slate-500 overflow-x-auto max-h-32">
                    {this.state.errorInfo.componentStack}
                  </pre>
                )}
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
