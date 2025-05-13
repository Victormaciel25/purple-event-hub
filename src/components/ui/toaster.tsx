
import { useToast } from "@/hooks/use-toast";

export function Toaster() {
  const { toasts } = useToast();
  
  return (
    <div className="fixed top-0 z-[100] flex flex-col items-end gap-2 w-full p-4">
      {toasts.map(function ({ id, title, description, action, ...props }) {
        return (
          <div
            key={id}
            className="bg-white border border-gray-200 shadow-lg rounded-lg p-4 max-w-md transform transition-all duration-300 ease-in-out"
            {...props}
          >
            <div className="flex flex-col gap-1">
              {title && <p className="font-medium text-gray-900">{title}</p>}
              {description && <p className="text-sm text-gray-700">{description}</p>}
              {action && <div className="mt-2">{action}</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
