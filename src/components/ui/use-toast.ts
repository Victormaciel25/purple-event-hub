
import { useToast, toast } from "@/hooks/use-toast";

// Add enhanced toast functions for convenience
const enhancedToast = {
  ...toast,
  error: (message: string) => toast({
    variant: "destructive",
    title: "Error",
    description: message,
  }),
  success: (message: string) => toast({
    title: "Success",
    description: message,
  }),
  warning: (message: string) => toast({
    title: "Warning",
    description: message,
  }),
  info: (message: string) => toast({
    title: "Info",
    description: message,
  }),
};

export { useToast, enhancedToast as toast };
