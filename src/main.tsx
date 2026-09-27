import React, { Component, ErrorInfo, ReactNode } from 'react';
import ReactDOM from 'react-dom/client';
import App from './app/App';
import './styles/globals.css';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class RootErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[MIO Root Error Caught]:', error, errorInfo);
  }

  render() {
    if (this.state.hasError && this.state.error) {
      return (
        <div className="min-h-screen bg-[#06050a] text-rose-400 p-8 font-mono flex flex-col items-center justify-center">
          <div className="max-w-2xl bg-black/80 border border-rose-500/40 p-6 rounded-2xl shadow-[0_0_40px_rgba(244,63,94,0.3)]">
            <h1 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-rose-500 animate-ping" />
              Error de Ejecución en Frontend
            </h1>
            <p className="text-sm text-gray-300 mb-4">{this.state.error.message}</p>
            <pre className="text-xs bg-black/60 p-4 rounded-xl overflow-x-auto text-gray-400 border border-white/10">
              {this.state.error.stack}
            </pre>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RootErrorBoundary>
      <App />
    </RootErrorBoundary>
  </React.StrictMode>
);
