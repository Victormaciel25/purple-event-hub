
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

export function useToast() {
  const [state, setState] = useState<ToastState>(initialState);

  const addToast = (toast: Omit<ToasterToast, "id" | "open">) => {
    setState((prevState) => ({
      ...prevState,
      toasts: [
        ...prevState.toasts,
        { id: genId(), open: true, ...toast },
      ].slice(-TOAST_LIMIT),
    }));
  };

  const updateToast = (toast: Partial<ToasterToast> & { id: string }) => {
    setState((prevState) => ({
      ...prevState,
      toasts: prevState.toasts.map((t) =>
        t.id === toast.id ? { ...t, ...toast } : t
      ),
    }));
  };

  const dismissToast = (toastId: string) => {
    setState((prevState) => ({
      ...prevState,
      toasts: prevState.toasts.map((t) =>
        t.id === toastId ? { ...t, open: false } : t
      ),
    }));
  };

  const removeToast = (toastId: string) => {
    setState((prevState) => ({
      ...prevState,
      toasts: prevState.toasts.filter((t) => t.id !== toastId),
    }));
  };

  useEffect(() => {
    const timers = state.toasts.map((toast) => {
      if (!toast.open) {
        const timer = setTimeout(() => {
          removeToast(toast.id);
        }, TOAST_REMOVE_DELAY);

        return { id: toast.id, timer };
      }
      return null;
    });

    return () => {
      timers.forEach((item) => {
        if (item) clearTimeout(item.timer);
      });
    };
  }, [state.toasts]);

  return {
    toasts: state.toasts,
    addToast,
    updateToast,
    dismissToast,
    removeToast,
  };
}

// Export a toast function for use in components
export const toast = {
  // Helper function to add a toast
  custom: (props: Omit<ToasterToast, "id" | "open">) => {
    const { addToast } = useToast();
    addToast(props);
  },
  
  // Default toast with just a message as description
  default: (message: string) => {
    const { addToast } = useToast();
    addToast({
      variant: "default",
      description: message,
    });
  },
  
  // Destructive/error toast
  error: (message: string) => {
    const { addToast } = useToast();
    addToast({
      variant: "destructive",
      description: message,
    });
  },
  
  // Success toast
  success: (message: string, options?: { duration?: number }) => {
    const { addToast } = useToast();
    addToast({
      description: message,
      ...options,
    });
  },
  
  // Dismiss a toast by ID
  dismiss: (toastId: string) => {
    const { dismissToast } = useToast();
    dismissToast(toastId);
  },
};
