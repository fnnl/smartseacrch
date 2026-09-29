import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from "react";

type ActionVariant = "filled" | "outlined" | "muted" | "danger";

const base: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  minHeight: 48,
  padding: "0 20px",
  borderRadius: 12,
  fontSize: 15,
  fontWeight: 600,
  lineHeight: 1.2,
  whiteSpace: "nowrap",
  cursor: "pointer",
  flexShrink: 0,
  fontFamily: "inherit",
  boxShadow: "0 1px 2px rgba(15, 23, 42, 0.08)",
};

const variants: Record<ActionVariant, CSSProperties> = {
  filled: {
    ...base,
    background: "#0f766e",
    color: "#ffffff",
    border: "2px solid #0f766e",
  },
  outlined: {
    ...base,
    background: "#ffffff",
    color: "#134e4a",
    border: "2px solid #0f766e",
  },
  muted: {
    ...base,
    background: "#ffffff",
    color: "#1e293b",
    border: "2px solid #64748b",
  },
  danger: {
    ...base,
    background: "#ffffff",
    color: "#b91c1c",
    border: "2px solid #dc2626",
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
