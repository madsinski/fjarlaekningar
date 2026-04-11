"use client";

interface MedaliaButtonProps {
  label?: string;
  variant?: "filled" | "outline";
  size?: "sm" | "md" | "lg";
  className?: string;
}

// TODO: replace data-src with the Fjarlækningar-specific Medalia portal URL
// once it has been provisioned. Defaults to the generic Medalia app root.
const MEDALIA_PORTAL_URL = "https://app.medalia.is/";

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
      ? "bg-[var(--primary)] text-white hover:bg-[var(--primary-dark)] shadow-lg shadow-sky-500/20 hover:shadow-sky-500/40"
      : "border-2 border-[var(--primary)] text-[var(--primary)] hover:bg-[var(--primary)] hover:text-white";

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
