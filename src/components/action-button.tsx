import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from "react";

type ActionVariant = "filled" | "outlined" | "muted" | "danger";

const base: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  minHeight: 44,
  padding: "0 18px",
  borderRadius: 10,
  fontSize: 15,
  fontWeight: 600,
  lineHeight: 1.2,
  whiteSpace: "nowrap",
  cursor: "pointer",
  flexShrink: 0,
  fontFamily: "inherit",
  boxShadow: "0 1px 2px rgba(27, 31, 36, 0.08)",
};

const variants: Record<ActionVariant, CSSProperties> = {
  filled: {
    ...base,
    background: "var(--primary)",
    color: "var(--primary-foreground)",
    border: "2px solid var(--primary)",
  },
  outlined: {
    ...base,
    background: "#ffffff",
    color: "var(--primary)",
    border: "2px solid var(--primary)",
  },
  muted: {
    ...base,
    background: "#ffffff",
    color: "var(--foreground)",
    border: "2px solid var(--border)",
  },
  danger: {
    ...base,
    background: "#ffffff",
    color: "#b42318",
    border: "2px solid #b42318",
  },
};

type ActionButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ActionVariant;
  children: ReactNode;
};

export function ActionButton({
  variant = "outlined",
  children,
  disabled,
  style,
  type = "button",
  ...props
}: ActionButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled}
      style={{
        ...variants[variant],
        ...(disabled
          ? { opacity: 0.55, cursor: "not-allowed", boxShadow: "none" }
          : null),
        ...style,
      }}
      {...props}
    >
      {children}
    </button>
  );
}
