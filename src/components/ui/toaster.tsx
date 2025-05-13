
import { useToast } from "@/hooks/use-toast";

export function Toaster() {
  // The toasts are now rendered directly in the ToastProvider
  // This component is kept for compatibility with existing code
  useToast();
  return null;
}
