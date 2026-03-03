/**
 * Platform Adapter Interface
 * Abstracts the platform-specific API (VS Code vs Electron) for the pixel agents webview.
 *
 * This allows the same webview code to work in:
 * - VS Code extension (original use case)
 * - Electron apps like SlayZone (via iframe or direct React integration)
 */

export interface PlatformAdapter {
  /** Send a message to the host platform */
  postMessage(message: Record<string, unknown>): void;

  /** Register a callback for messages from the host platform */
  onMessage(callback: (message: Record<string, unknown>) => void): () => void;

  /** Get the URI for an asset file */
  getAssetPath(relativePath: string): string;
}

/**
 * VS Code adapter implementation
 * Uses the VS Code webview API for communication.
 */
export class VSCodeAdapter implements PlatformAdapter {
  private vscode: { postMessage(msg: unknown): void };

  constructor() {
    // In VS Code webview, acquireVsCodeApi is globally available
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    this.vscode = (globalThis as unknown as { acquireVsCodeApi(): { postMessage(msg: unknown): void } }).acquireVsCodeApi();
  }

  postMessage(message: Record<string, unknown>): void {
    this.vscode.postMessage(message);
  }

  onMessage(callback: (message: Record<string, unknown>) => void): () => void {
    const handler = (event: MessageEvent): void => {
      callback(event.data);
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }

  getAssetPath(relativePath: string): string {
    // In VS Code webview, use relative paths since assets are bundled
    return relativePath;
  }
}

/**
 * Electron adapter implementation
 * Uses postMessage API for iframe communication.
 */
export class ElectronAdapter implements PlatformAdapter {
  private targetWindow: Window;

  constructor(targetWindow: Window = window.parent) {
    this.targetWindow = targetWindow;
  }

  postMessage(message: Record<string, unknown>): void {
    // Add source identifier for message filtering
    this.targetWindow.postMessage({
      source: 'pixel-agents-webview',
      ...message
    }, '*');
  }

  onMessage(callback: (message: Record<string, unknown>) => void): () => void {
    const handler = (event: MessageEvent): void => {
      // Only process messages from our host
      if (event.data.source !== 'pixel-agents-host') return;
      // Strip the source wrapper before passing to callback
      const { source: _source, ...message } = event.data;
      callback(message);
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }

  getAssetPath(relativePath: string): string {
    // In Electron, assets are served from the dist directory
    return new URL(relativePath, import.meta.url).href;
  }
}

/**
 * Direct adapter implementation
 * Uses callback-based communication for direct React integration.
 * This allows pixel-agents to be used as a React component without iframe/postMessage.
 */
export class DirectAdapter implements PlatformAdapter {
  private onSendMessage: (message: Record<string, unknown>) => void;
  private onReceiveMessage: (callback: (message: Record<string, unknown>) => void) => () => void;

  constructor(
    onSendMessage: (message: Record<string, unknown>) => void,
    onReceiveMessage: (callback: (message: Record<string, unknown>) => void) => () => void
  ) {
    this.onSendMessage = onSendMessage;
    this.onReceiveMessage = onReceiveMessage;
  }

  postMessage(message: Record<string, unknown>): void {
    this.onSendMessage(message);
  }

  onMessage(callback: (message: Record<string, unknown>) => void): () => void {
    return this.onReceiveMessage(callback);
  }

  getAssetPath(relativePath: string): string {
    // For direct integration, assets are bundled with the component
    return relativePath;
  }
}

/**
 * Create the appropriate adapter based on the environment
 * This is determined at build time.
 */
export function createAdapter(): PlatformAdapter {
  // Check if we're in a VS Code webview environment
  if (typeof (globalThis as unknown as { acquireVsCodeApi?: () => unknown }).acquireVsCodeApi === 'function') {
    return new VSCodeAdapter();
  }
  // Default to Electron adapter (for iframe usage)
  return new ElectronAdapter();
}

// Export a singleton instance for default usage
export const adapter = createAdapter();
