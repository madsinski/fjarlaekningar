interface PortalButtonProps {
  label?: string;
  variant?: "filled" | "outline";
  size?: "sm" | "md" | "lg";
  className?: string;
}

// Sjúklingagátt Fjarlækninga. The URL below is the vendor-provisioned portal
// instance for the HSU pilot and is deliberately left as-is: it is where
// patients actually land, not a brand reference we can rewrite. Opened
// directly (the portal is a normal page), so every "Opna sjúklingagátt"
// button links here.
const PORTAL_URL = "https://app.medalia.dev/hsu-fjarlaekningar";

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
    <a
      href={PORTAL_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center justify-center font-semibold rounded-full transition-all ${sizeClasses[size]} ${variantClasses} ${className}`}
    >
      {label}
    </a>
  );
}
