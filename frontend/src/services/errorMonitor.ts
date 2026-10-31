// Frontend Error Monitoring and Telemetry Service

export interface ErrorEvent {
  id: string;
  message: string;
  stack?: string;
  source?: string;
  lineno?: number;
  colno?: number;
  timestamp: string;
  url: string;
}

class ErrorMonitor {
  private errors: ErrorEvent[] = [];
  private readonly maxErrors = 50;
  private initialized = false;

  public init() {
    if (this.initialized || typeof window === 'undefined') return;

    window.addEventListener('error', (event: globalThis.ErrorEvent) => {
      this.captureException(event.error || new Error(event.message), {
        source: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      });
    });

    window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
      const reason = event.reason instanceof Error ? event.reason : new Error(String(event.reason));
      this.captureException(reason, { source: 'UnhandledPromiseRejection' });
    });

    this.initialized = true;
  }

  public captureException(error: Error | string, context: Record<string, unknown> = {}) {
    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;

    // Sanitize any potential sensitive tokens or passwords
    const sanitizedMsg = message.replace(/(Bearer\s+)[A-Za-z0-9._-]+/gi, '$1[REDACTED]');

    const event: ErrorEvent = {
      id: Math.random().toString(36).substring(2, 9),
      message: sanitizedMsg,
      stack,
      source: (context.source as string) || 'client_runtime',
      lineno: context.lineno as number | undefined,
      colno: context.colno as number | undefined,
      timestamp: new Date().toISOString(),
      url: typeof window !== 'undefined' ? window.location.href : '',
    };

    this.errors.unshift(event);
    if (this.errors.length > this.maxErrors) {
      this.errors.pop();
    }

    if (import.meta.env.DEV) {
      console.warn('[TrustTrace ErrorMonitor]', sanitizedMsg, event);
    }
  }

  public getErrors(): ErrorEvent[] {
    return [...this.errors];
  }

  public clearErrors() {
    this.errors = [];
  }
}

export const errorMonitor = new ErrorMonitor();
