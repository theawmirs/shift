import React from "react";

export type ButtonVariant = "primary" | "ghost" | "violet" | "danger" | "none";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  loading?: boolean;
  loadingText?: string;
  icon?: React.ReactNode;
  size?: "sm" | "md" | "lg";
}

export function Button({
  children,
  variant = "ghost",
  loading = false,
  loadingText,
  icon,
  size = "md",
  className = "",
  disabled,
  style,
  ...props
}: ButtonProps) {
  const isCustomClass = className.includes("btn-");
  const variantClass = variant !== "none" && !isCustomClass ? `btn-${variant}` : "";
  const finalClass = `btn ${variantClass} ${loading ? "btn-loading" : ""} ${className}`.trim();

  const spinnerSizeClass = size === "sm" ? "spinner--sm" : size === "lg" ? "spinner--lg" : "";
  const isWhiteText = variant === "violet" || variant === "danger";

  return (
    <button
      {...props}
      className={finalClass}
      disabled={disabled || loading}
      aria-busy={loading}
      style={{
        ...style,
      }}
    >
      {loading ? (
        <>
          <span className={`spinner ${spinnerSizeClass} ${isWhiteText ? "spinner--white" : ""}`.trim()} />
          <span>{loadingText !== undefined ? loadingText : children}</span>
        </>
      ) : (
        <>
          {icon && <span style={{ display: "inline-flex", alignItems: "center", flexShrink: 0 }}>{icon}</span>}
          {children}
        </>
      )}
    </button>
  );
}
