import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    error: null,
  };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Dashboard render failed', error, info);
  }

  render() {
    if (!this.state.error) {
      return this.props.children;
    }

    return (
      <div className="min-h-screen bg-background text-foreground p-6 flex items-start justify-center">
        <div className="w-full max-w-2xl rounded-lg border border-destructive/30 bg-card p-5 shadow-sm">
          <div className="flex gap-3">
            <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
            <div className="space-y-3">
              <div>
                <h1 className="text-lg font-semibold">Dashboard could not render</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  The app hit an unexpected data shape while rendering live Control D data.
                </p>
              </div>
              <pre className="max-h-40 overflow-auto rounded-md bg-muted p-3 text-xs whitespace-pre-wrap">
                {this.state.error.message}
              </pre>
              <Button onClick={() => window.location.reload()}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Reload dashboard
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
