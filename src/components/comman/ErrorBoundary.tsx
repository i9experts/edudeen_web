import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RotateCw } from 'lucide-react';
import { Button } from '@/components/comman/ui/Button';

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Changing this clears a caught error (e.g. the route path) without remounting the children. */
  resetKey?: unknown;
}

interface ErrorBoundaryState {
  error: Error | null;
}

// Catches render-time errors and failed lazy-chunk loads anywhere below it so a
// single broken page can't take down the whole app with a blank white screen.
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary] Uncaught error:', error, info.componentStack);
  }

  componentDidUpdate(prev: ErrorBoundaryProps) {
    if (this.state.error && prev.resetKey !== this.props.resetKey) this.setState({ error: null });
  }

  handleReset = () => this.setState({ error: null });

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-4 px-6 text-center">
        <div className="size-12 rounded-full bg-brand-pale-orange flex items-center justify-center">
          <AlertTriangle size={22} className="text-brand-orange" />
        </div>
        <div>
          <h1 className="text-[17px] font-bold text-carbon">Something went wrong</h1>
          <p className="text-[13px] text-slate mt-1 max-w-[360px]">
            This page ran into an unexpected error. You can try again, or reload the app.
          </p>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <Button variant="ghost" size="sm" onClick={this.handleReset}>
            Try again
          </Button>
          <Button variant="primary" size="sm" onClick={() => window.location.reload()} className="gap-1.5">
            <RotateCw size={13} /> Reload page
          </Button>
        </div>
      </div>
    );
  }
}
