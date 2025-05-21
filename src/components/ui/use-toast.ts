
import { useToast as useToastOriginal, toast as toastOriginal } from "@/hooks/use-toast";

type ToastProps = Parameters<typeof toastOriginal>[0];

// Create a non-functional toast wrapper
const toast = Object.assign(
  (props: ToastProps) => toastOriginal(props),
  {
    error: (description: string) => {
      // No-op implementation
      return {
        id: "",
        dismiss: () => {},
        update: () => {},
      };
    },
    success: (description: string) => {
      // No-op implementation
      return {
        id: "",
        dismiss: () => {},
        update: () => {},
      };
    },
    warning: (description: string) => {
      // No-op implementation
      return {
        id: "",
        dismiss: () => {},
        update: () => {},
      };
    },
    info: (description: string) => {
      // No-op implementation
      return {
        id: "",
        dismiss: () => {},
        update: () => {},
      };
    },
  }
);

export { useToastOriginal as useToast, toast };
