import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Uncaught error:', error, errorInfo);
    }

    private handleReload = () => {
        window.location.reload();
    };

    public render() {
        if (this.state.hasError) {
            return (
                <div className="flex flex-col items-center justify-center h-screen w-full bg-background p-6">
                    <div className="max-w-md w-full bg-card border border-border rounded-xl shadow-2xl p-8 flex flex-col items-center text-center">
                        <div className="p-3 bg-destructive/10 rounded-full mb-4">
                            <AlertTriangle className="w-8 h-8 text-destructive" />
                        </div>

                        <h1 className="text-2xl font-bold mb-2">Something went wrong</h1>
                        <p className="text-muted-foreground mb-6">
                            Must be a glitch in the simulation. The application encountered an unexpected error.
                        </p>

                        {this.state.error && (
                            <div className="w-full bg-muted/50 p-3 rounded-lg text-left mb-6 overflow-hidden">
                                <code className="text-xs text-muted-foreground font-mono break-words block">
                                    {this.state.error.message}
                                </code>
                            </div>
                        )}

                        <button
                            onClick={this.handleReload}
                            className="flex items-center gap-2 px-5 py-2.5 bg-accent text-accent-foreground hover:bg-accent/90 rounded-lg font-medium transition-colors"
                        >
                            <RefreshCw className="w-4 h-4" />
                            Reload Application
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
