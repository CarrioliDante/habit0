import { ButtonHTMLAttributes, ReactNode } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
  children: ReactNode;
}

/**
 * Componente de botón reutilizable con variantes y tamaños
 */
export function Button({
  variant = "primary",
  size = "md",
  className = "",
  children,
  disabled,
  ...props
}: ButtonProps) {
  // Estilos base
  const baseStyles = "rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed";

  // Variantes de estilo
  const variants = {
    primary: "bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800",
    secondary: "bg-gray-200 text-gray-900 hover:bg-gray-300 active:bg-gray-400",
    danger: "bg-red-600 text-white hover:bg-red-700 active:bg-red-800",
    ghost: "bg-transparent hover:bg-gray-100 active:bg-gray-200",
  };

  // Tamaños
  const sizes = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2 text-base",
    lg: "px-6 py-3 text-lg",
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}
