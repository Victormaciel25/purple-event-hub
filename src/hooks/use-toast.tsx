
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast";
import { useState, useEffect, createContext, useContext } from "react";

const TOAST_LIMIT = 10;
const TOAST_REMOVE_DELAY = 1000;

type ToasterToast = {
  id: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  open: boolean;
  onOpenChange?: (open: boolean) => void;
  variant?: "default" | "destructive";
};

const actionTypes = {
  ADD_TOAST: "ADD_TOAST",
  UPDATE_TOAST: "UPDATE_TOAST",
  DISMISS_TOAST: "DISMISS_TOAST",
  REMOVE_TOAST: "REMOVE_TOAST",
} as const;

let count = 0;

function genId() {
  count = (count + 1) % Number.MAX_SAFE_INTEGER;
  return count.toString();
}

type ActionType = typeof actionTypes;

type Action =
  | {
      type: ActionType["ADD_TOAST"];
      toast: Omit<ToasterToast, "id" | "open">;
    }
  | {
      type: ActionType["UPDATE_TOAST"];
      toast: Partial<ToasterToast> & { id: string };
    }
  | {
      type: ActionType["DISMISS_TOAST"];
      toastId?: string;
    }
  | {
      type: ActionType["REMOVE_TOAST"];
      toastId?: string;
    };

interface ToastState {
  toasts: ToasterToast[];
}

const initialState: ToastState = {
  toasts: [],
};

const reducer = (state: ToastState, action: Action): ToastState => {
  switch (action.type) {
    case actionTypes.ADD_TOAST:
      return {
        ...state,
        toasts: [
          ...state.toasts,
          { id: genId(), open: true, ...action.toast },
        ].slice(-TOAST_LIMIT),
      };

    case actionTypes.UPDATE_TOAST:
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === action.toast.id ? { ...t, ...action.toast } : t
        ),
      };

    case actionTypes.DISMISS_TOAST: {
      const { toastId } = action;

      if (toastId) {
        return {
          ...state,
          toasts: state.toasts.map((t) =>
            t.id === toastId ? { ...t, open: false } : t
          ),
        };
      }

      return {
        ...state,
        toasts: state.toasts.map((t) => ({ ...t, open: false })),
      };
    }
    case actionTypes.REMOVE_TOAST:
      if (action.toastId === undefined) {
        return {
          ...state,
          toasts: [],
        };
      }
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.toastId),
      };
    default:
      return state;
  }
};

type ToastContextType = {
  toasts: ToasterToast[];
  addToast: (toast: Omit<ToasterToast, "id" | "open">) => void;
  updateToast: (toast: Partial<ToasterToast> & { id: string }) => void;
  dismissToast: (toastId: string) => void;
  removeToast: (toastId: string) => void;
};

const ToastContext = createContext<ToastContextType>({
  toasts: [],
  addToast: () => {},
  updateToast: () => {},
  dismissToast: () => {},
  removeToast: () => {},
});

// The context provider that must be available in the app when using toasts
export const ToastProvider = ({ children }: { children: React.ReactNode }) => {
  const [state, dispatch] = React.useReducer(reducer, initialState);

  React.useEffect(() => {
    state.toasts.forEach((toast) => {
      if (toast.open === false) {
        setTimeout(() => {
          dispatch({
            type: actionTypes.REMOVE_TOAST,
            toastId: toast.id,
          });
        }, TOAST_REMOVE_DELAY);
      }
    });
  }, [state.toasts]);

  return (
    <ToastContext.Provider
      value={{
        toasts: state.toasts,
        addToast: (toast) => {
          dispatch({ type: actionTypes.ADD_TOAST, toast });
        },
        updateToast: (toast) => {
          dispatch({ type: actionTypes.UPDATE_TOAST, toast });
        },
        dismissToast: (toastId) => {
          dispatch({ type: actionTypes.DISMISS_TOAST, toastId });
        },
        removeToast: (toastId) => {
          dispatch({ type: actionTypes.REMOVE_TOAST, toastId });
        },
      }}
    >
      {children}
    </ToastContext.Provider>
  );
};

// Hook to use toast
export function useToast() {
  const context = React.useContext(ToastContext);

  if (context === undefined) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  
  // Add a toast function directly to the returned object
  return {
    ...context,
    toast: (props: Omit<ToasterToast, "id" | "open">) => {
      context.addToast(props);
    }
  };
}

// Create a separate toast object for direct import
// This uses the current context via useToast internally
const toastFn = (props: Omit<ToasterToast, "id" | "open">) => {
  const { addToast } = React.useContext(ToastContext);
  if (!addToast) {
    console.error("Toast function called outside of ToastProvider context");
    return;
  }
  addToast(props);
};

// Standalone toast functions for common use cases
export const toast = {
  // Helper function to add a toast
  custom: (props: Omit<ToasterToast, "id" | "open">) => {
    toastFn(props);
  },
  
  // Default toast with just a message as description
  default: (message: string) => {
    toastFn({
      variant: "default",
      description: message,
    });
  },
  
  // Destructive/error toast
  error: (message: string) => {
    toastFn({
      variant: "destructive",
      description: message,
    });
  },
  
  // Success toast
  success: (message: string) => {
    toastFn({
      description: message,
    });
  },
  
  // Warning toast
  warning: (message: string) => {
    toastFn({
      description: message,
      variant: "default",
    });
  },
  
  // Dismiss a toast by ID
  dismiss: (toastId: string) => {
    const { dismissToast } = React.useContext(ToastContext);
    if (dismissToast) {
      dismissToast(toastId);
    }
  },
};
