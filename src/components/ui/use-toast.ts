
import { useToast as useToastOriginal, toast as toastOriginal } from "@/hooks/use-toast";

type ToastProps = Parameters<typeof toastOriginal>[0];

const toast = Object.assign(
  (props: ToastProps) => toastOriginal(props),
  {
    error: (description: string) => toastOriginal({
      variant: "destructive",
      title: "Erro",
      description,
    }),
    success: (description: string) => toastOriginal({
      title: "Sucesso",
      description,
    }),
    warning: (description: string) => toastOriginal({
      title: "Aviso",
      description,
    }),
    info: (description: string) => toastOriginal({
      title: "Informação",
      description,
    }),
  }
);

export { useToastOriginal as useToast, toast };
