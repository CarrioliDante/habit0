"use client";
import { useEffect, useState, useCallback } from "react";
import { X, CheckCircle, AlertCircle, Info } from "lucide-react";

export type ToastType = "success" | "error" | "info";

interface ToastProps {
  message: string;
  type: ToastType;
  duration?: number;
  onClose: () => void;
}

export function Toast({ message, type, duration = 2000, onClose }: ToastProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  const handleClose = useCallback(() => {
    setIsExiting(true);
    setTimeout(onClose, 200); // Wait for exit animation
  }, [onClose]);

  // Animate in on mount
  useEffect(() => {
    requestAnimationFrame(() => {
      setIsVisible(true);
    });
  }, []);

  // Auto-dismiss after duration
  useEffect(() => {
    const timer = setTimeout(() => {
      handleClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, handleClose]);

  const icons = {
    success: <CheckCircle className="w-4 h-4 shrink-0" />,
    error: <AlertCircle className="w-4 h-4 shrink-0" />,
    info: <Info className="w-4 h-4 shrink-0" />,
  };

  const colors = {
    success: "bg-green-500/95 dark:bg-green-600/95 text-white border-green-600/20",
    error: "bg-red-500/95 dark:bg-red-600/95 text-white border-red-600/20",
    info: "bg-blue-500/95 dark:bg-blue-600/95 text-white border-blue-600/20",
  };

  return (
    <div
      className={`
        flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl
        shadow-lg backdrop-blur-sm border
        transition-all duration-200 ease-out
        ${colors[type]}
        ${
          isVisible && !isExiting
            ? "opacity-100 translate-x-0 scale-100"
            : "opacity-0 translate-x-8 scale-95"
        }
      `}
      role="alert"
    >
      {icons[type]}
      <span className="text-sm font-medium leading-tight">{message}</span>
      <button
        onClick={handleClose}
        className="ml-1 p-0.5 hover:bg-white/20 rounded transition-colors"
        aria-label="Close"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

interface ToastContainerProps {
  toasts: Array<{ id: string; message: string; type: ToastType }>;
  onRemove: (id: string) => void;
}

export function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col-reverse gap-2 pointer-events-none">
      {toasts.map((toast, index) => (
        <div
          key={toast.id}
          className="pointer-events-auto"
          style={{
            animation: `slideIn 0.2s ease-out`,
            animationDelay: `${index * 50}ms`,
          }}
        >
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => onRemove(toast.id)}
          />
        </div>
      ))}
      <style jsx>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(2rem) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateX(0) scale(1);
          }
        }
      `}</style>
    </div>
  );
}
