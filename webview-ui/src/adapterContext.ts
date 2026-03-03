import { createContext, useContext } from 'react';
import type { PlatformAdapter } from './adapter.js';
import { adapter as defaultAdapter } from './adapter.js';

export const AdapterContext = createContext<PlatformAdapter>(defaultAdapter);

export function useAdapter(): PlatformAdapter {
  return useContext(AdapterContext);
}
