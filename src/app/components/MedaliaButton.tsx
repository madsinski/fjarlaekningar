"use client";

interface MedaliaButtonProps {
  label?: string;
  variant?: "filled" | "outline";
  size?: "sm" | "md" | "lg";
  className?: string;
}

// Fjarlækningar patient portal (sjúklingagátt) — the provisioned Medalia URL
// for the HSU pilot. Used as the widget data-src by every "Opna sjúklingagátt"
// button across the site.
const MEDALIA_PORTAL_URL = "https://app.medalia.dev/hsu-fjarlaekningar";

export default function MedaliaButton({
  label = "Opna sjúklingagátt",
  variant = "filled",
  size = "md",
  className = "",
}: MedaliaButtonProps) {
  const sizeClasses = {
    sm: "px-5 py-2 text-sm",
    md: "px-7 py-3 text-base",
    lg: "px-10 py-4 text-base",
  };

  const variantClasses =
    variant === "filled"
      ? "bg-[var(--primary-dark)] text-white hover:brightness-110 shadow-lg shadow-[var(--primary-dark)]/20 hover:shadow-[var(--primary-dark)]/40"
      : "border-2 border-[var(--primary-dark)] text-[var(--primary-dark)] hover:bg-[var(--primary-dark)] hover:text-white";

  return (
    <button
      className={`medalia-widget inline-flex items-center justify-center font-semibold rounded-full transition-all ${sizeClasses[size]} ${variantClasses} ${className}`}
      data-src={MEDALIA_PORTAL_URL}
      type="button"
    >
      {label}
    </button>
  );
}
