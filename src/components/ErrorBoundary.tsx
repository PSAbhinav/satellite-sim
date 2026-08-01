import { Component, type ReactNode } from 'react';

interface State {
  error: Error | null;
}

/** Last line of defense: never show a silent black screen. */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex h-64 flex-col items-center justify-center gap-3 p-6 text-center">
          <p className="font-display text-sm uppercase tracking-widest text-crimson">
            Telemetry lost
          </p>
          <p className="max-w-sm text-xs text-muted-star">
            Something went wrong on this console. Reloading usually restores the signal — your
            mission progress is saved.
          </p>
          <button
            className="cursor-pointer rounded-panel border border-line bg-console-2 px-4 py-2 font-display text-xs uppercase tracking-wider text-phosphor hover:bg-console"
            onClick={() => window.location.reload()}
          >
            Reload mission control
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
