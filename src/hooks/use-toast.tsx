
import * as React from "react";
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider as ToastPrimitive,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast";

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
  toast: {
    custom: (props: Omit<ToasterToast, "id" | "open">) => void;
    default: (message: string) => void;
    error: (message: string) => void;
    success: (message: string) => void;
    warning: (message: string) => void;
    dismiss: (toastId: string) => void;
  };
};

const ToastContext = React.createContext<ToastContextType | undefined>(undefined);

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

  const toastFunctions = React.useMemo(() => ({
    custom: (props: Omit<ToasterToast, "id" | "open">) => {
      dispatch({ type: actionTypes.ADD_TOAST, toast: props });
    },
    default: (message: string) => {
      dispatch({
        type: actionTypes.ADD_TOAST,
        toast: { variant: "default", description: message },
      });
    },
    error: (message: string) => {
      dispatch({
        type: actionTypes.ADD_TOAST,
        toast: { variant: "destructive", description: message },
      });
    },
    success: (message: string) => {
      dispatch({
        type: actionTypes.ADD_TOAST,
        toast: { description: message },
      });
    },
    warning: (message: string) => {
      dispatch({
        type: actionTypes.ADD_TOAST,
        toast: { description: message, variant: "default" },
      });
    },
    dismiss: (toastId: string) => {
      dispatch({ type: actionTypes.DISMISS_TOAST, toastId });
    },
  }), [dispatch]);

  const contextValue = React.useMemo(
    () => ({
      toasts: state.toasts,
      addToast: (toast: Omit<ToasterToast, "id" | "open">) => {
        dispatch({ type: actionTypes.ADD_TOAST, toast });
      },
      updateToast: (toast: Partial<ToasterToast> & { id: string }) => {
        dispatch({ type: actionTypes.UPDATE_TOAST, toast });
      },
      dismissToast: (toastId: string) => {
        dispatch({ type: actionTypes.DISMISS_TOAST, toastId });
      },
      removeToast: (toastId: string) => {
        dispatch({ type: actionTypes.REMOVE_TOAST, toastId });
      },
      toast: toastFunctions,
    }),
    [state.toasts, toastFunctions]
  );

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <ToastPrimitive>
        {state.toasts.map(({ id, title, description, action, ...props }) => (
          <Toast key={id} {...props}>
            <div className="grid gap-1">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && <ToastDescription>{description}</ToastDescription>}
            </div>
            {action}
            <ToastClose />
          </Toast>
        ))}
        <ToastViewport />
      </ToastPrimitive>
    </ToastContext.Provider>
  );
};

// Hook to use toast
export function useToast() {
  const context = React.useContext(ToastContext);

  if (context === undefined) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  
  return context;
}

// Create standalone toast object for direct import
export const toast = {
  custom: (props: Omit<ToasterToast, "id" | "open">) => {
    const context = React.useContext(ToastContext);
    if (!context) {
      console.error("Toast function called outside of ToastProvider context");
      return;
    }
    context.addToast(props);
  },
  
  default: (message: string) => {
    const context = React.useContext(ToastContext);
    if (!context) {
      console.error("Toast function called outside of ToastProvider context");
      return;
    }
    context.toast.default(message);
  },
  
  error: (message: string) => {
    const context = React.useContext(ToastContext);
    if (!context) {
      console.error("Toast function called outside of ToastProvider context");
      return;
    }
    context.toast.error(message);
  },
  
  success: (message: string) => {
    const context = React.useContext(ToastContext);
    if (!context) {
      console.error("Toast function called outside of ToastProvider context");
      return;
    }
    context.toast.success(message);
  },
  
  warning: (message: string) => {
    const context = React.useContext(ToastContext);
    if (!context) {
      console.error("Toast function called outside of ToastProvider context");
      return;
    }
    context.toast.warning(message);
  },
  
  dismiss: (toastId: string) => {
    const context = React.useContext(ToastContext);
    if (!context) {
      console.error("Toast function called outside of ToastProvider context");
      return;
    }
    context.toast.dismiss(toastId);
  },
};
