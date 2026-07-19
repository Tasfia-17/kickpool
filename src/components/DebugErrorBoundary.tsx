"use client";

import * as React from 'react';

interface Props {
  children: React.ReactNode;
  debugContext?: any;
}

interface State {
  hasError: boolean;
  error?: Error | null;
  info?: React.ErrorInfo | null;
}

export default class DebugErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, info: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error } as Partial<State>;
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    try {
      const payload = {
        error: { message: error.message, stack: error.stack },
        info,
        debugContext: this.props.debugContext,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
        time: new Date().toISOString(),
      };
      // persist to localStorage so user can copy it out of the app
      try {
        localStorage.setItem('lastErrorReport', JSON.stringify(payload));
      } catch {
        // ignore storage errors
      }
      // also print to console for devs
      // eslint-disable-next-line no-console
      console.error('DebugErrorBoundary captured error', payload);
    } catch {
      // swallow
    }
    this.setState({ hasError: true, error, info });
  }

  copyReport = async () => {
    try {
      const report = localStorage.getItem('lastErrorReport') || JSON.stringify({ error: this.state.error?.message, info: this.state.info, debugContext: this.props.debugContext });
      if (report && typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(report);
        // eslint-disable-next-line no-console
        console.log('Error report copied to clipboard');
      }
    } catch {
      // ignore
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 999999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)' }}>
          <div style={{ width: 'min(980px, 94%)', maxHeight: '86vh', overflowY: 'auto', background: '#fff', padding: 20, borderRadius: 8, boxShadow: '0 8px 30px rgba(0,0,0,0.6)' }}>
            <h2 style={{ margin: 0, marginBottom: 8 }}>An error occurred</h2>
            <p style={{ marginTop: 0, color: '#333' }}>{this.state.error?.message}</p>
            <details style={{ whiteSpace: 'pre-wrap', marginBottom: 12 }}>
              <summary style={{ cursor: 'pointer' }}>Debug context and stack (click to expand)</summary>
              <pre style={{ fontSize: 12, maxHeight: '60vh', overflow: 'auto' }}>{JSON.stringify({ error: this.state.error?.message, stack: this.state.error?.stack, info: this.state.info, debugContext: this.props.debugContext }, null, 2)}</pre>
            </details>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button type="button" onClick={this.copyReport} style={{ padding: '8px 12px', borderRadius: 6, border: 'none', background: '#2563eb', color: '#fff', cursor: 'pointer' }}>Copy report</button>
              <button type="button" onClick={() => { try { localStorage.removeItem('lastErrorReport'); } catch(e){}; this.setState({ hasError: false, error: null, info: null }); }} style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #ddd', background: '#fff', cursor: 'pointer' }}>Dismiss</button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children as React.ReactElement;
  }
}
