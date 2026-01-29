import * as React from "react";
import type { ToastProps } from "@/components/ui/toast";

type ToastState = ToastProps & {
  id: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
};

type ToastAction =
  | { type: "ADD_TOAST"; toast: ToastState }
  | { type: "DISMISS_TOAST"; toastId?: string };

const ToastContext = React.createContext<{
  toasts: ToastState[];
  toast: (t: Omit<ToastState, "id">) => void;
  dismiss: (toastId?: string) => void;
} | null>(null);

function toastReducer(state: ToastState[], action: ToastAction) {
  switch (action.type) {
    case "ADD_TOAST":
      return [action.toast, ...state].slice(0, 4);
    case "DISMISS_TOAST":
      if (!action.toastId) return [];
      return state.filter((t) => t.id !== action.toastId);
    default:
      return state;
  }
}

function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, dispatch] = React.useReducer(toastReducer, []);

  const toast = React.useCallback((t: Omit<ToastState, "id">) => {
    const id = crypto.randomUUID();
    dispatch({ type: "ADD_TOAST", toast: { id, ...t } });
    window.setTimeout(() => dispatch({ type: "DISMISS_TOAST", toastId: id }), 3500);
  }, []);

  const dismiss = React.useCallback((toastId?: string) => {
    dispatch({ type: "DISMISS_TOAST", toastId });
  }, []);

  const value = React.useMemo(() => ({ toasts, toast, dismiss }), [toasts, toast, dismiss]);

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>;
}

function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return ctx;
}

export { ToastProvider, useToast };

export function toast(t: Omit<ToastState, "id">) {
  const event = new CustomEvent("app-toast", { detail: t });
  window.dispatchEvent(event);
}

// Helper functions for common toast patterns
export function toastError(title: string, description?: string) {
  toast({ title, description, variant: "destructive" });
}

export function toastSuccess(title: string, description?: string) {
  toast({ title, description, variant: "default" });
}

export function toastInfo(title: string, description?: string) {
  toast({ title, description, variant: "default" });
}

export function ToastGlobalListener() {
  const { toast: enqueue } = useToast();

  React.useEffect(() => {
    function handler(e: Event) {
      const event = e as CustomEvent<Omit<ToastState, "id">>;
      enqueue(event.detail);
    }
    window.addEventListener("app-toast", handler);
    return () => window.removeEventListener("app-toast", handler);
  }, [enqueue]);

  return null;
}
