export type ToastKind = 'success' | 'error' | 'info' | 'message';

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastOptions {
  id?: string;
  duration?: number;
  description?: string;
  action?: ToastAction;
}

export interface ToastItem {
  key: number;
  id: string;
  kind: ToastKind;
  message: string;
  description?: string;
  action?: ToastAction;
}

const TOAST_LIMIT = 3;
const TOAST_TTL_MS = 4_500;

let toasts: ToastItem[] = [];
let nextKey = 1;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

export function subscribeToasts(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getToasts(): ToastItem[] {
  return toasts;
}

function add(kind: ToastKind, message: string, options: ToastOptions = {}): string {
  const key = nextKey++;
  const id = options.id ?? `toast-${key}`;
  // A caller-supplied id replaces its previous toast instead of stacking updates.
  toasts = [
    ...toasts.filter((item) => item.id !== id),
    { key, id, kind, message, description: options.description, action: options.action },
  ].slice(-TOAST_LIMIT);
  emit();
  setTimeout(() => dismissToast(id), options.duration ?? TOAST_TTL_MS);
  return id;
}

export function dismissToast(id: string): void {
  const next = toasts.filter((item) => item.id !== id);
  if (next.length === toasts.length) return;
  toasts = next;
  emit();
}

// The four calls the app uses; a bare toast(...) is the neutral message.
const show = (message: string, options?: ToastOptions) => add('message', message, options);

export const toast = Object.assign(show, {
  success: (message: string, options?: ToastOptions) => add('success', message, options),
  error: (message: string, options?: ToastOptions) => add('error', message, options),
  info: (message: string, options?: ToastOptions) => add('info', message, options),
  message: (message: string, options?: ToastOptions) => add('message', message, options),
});
