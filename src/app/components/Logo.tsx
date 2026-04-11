interface LogoProps {
  className?: string;
  variant?: "dark" | "light";
}

export default function Logo({ className = "", variant = "dark" }: LogoProps) {
  const markColor = variant === "light" ? "#ffffff" : "var(--primary)";
  const textColor = variant === "light" ? "#ffffff" : "var(--foreground)";

  return (
    <span
      className={`inline-flex items-center gap-2 font-semibold tracking-tight ${className}`}
      aria-label="Fjarlækningar"
    >
      <svg
        width="28"
        height="28"
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <circle cx="16" cy="16" r="14" stroke={markColor} strokeWidth="2.5" />
        <path
          d="M16 8.5v15M8.5 16h15"
          stroke={markColor}
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </svg>
      <span style={{ color: textColor }}>Fjarlækningar</span>
    </span>
  );
}
