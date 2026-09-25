import TriageTrigger from "./TriageTrigger";

interface PortalButtonProps {
  label?: string;
  variant?: "filled" | "outline";
  size?: "sm" | "md" | "lg";
  className?: string;
}

// Sjúklingagátt Fjarlækninga. Every "Opna sjúklingagátt" button opens the
// "Hvert á ég að leita?" triage first (src/lib/triage.ts), which routes
// requests the doctors cannot resolve in writing to 112, 1700, Heilsuvera or
// the health centre before the patient signs in. The portal URL itself lives
// in triage.ts; it is the vendor-provisioned instance for the HSU pilot.

export default function PortalButton({
  label = "Opna sjúklingagátt",
  variant = "filled",
  size = "md",
  className = "",
}: PortalButtonProps) {
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
    <TriageTrigger
      className={`inline-flex items-center justify-center font-semibold rounded-full transition-all ${sizeClasses[size]} ${variantClasses} ${className}`}
    >
      {label}
    </TriageTrigger>
  );
}
