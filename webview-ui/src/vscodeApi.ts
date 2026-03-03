declare function acquireVsCodeApi(): { postMessage(msg: unknown): void }

// Check if we're in VS Code environment before calling acquireVsCodeApi
// In Electron/Browser, this will be undefined and we'll use a fallback
const _vscodeApi = typeof (globalThis as unknown as { acquireVsCodeApi?: () => unknown }).acquireVsCodeApi === 'function'
  ? (globalThis as unknown as { acquireVsCodeApi: () => { postMessage(msg: unknown): void } }).acquireVsCodeApi()
  : undefined;

export const vscode = _vscodeApi ?? { postMessage: (_msg: unknown) => {} }
