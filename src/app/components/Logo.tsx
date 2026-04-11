import Image from "next/image";

// Source asset: 1920x660 (aspect ratio ~2.909:1). Exported from Figma
// file s8CAdWGmOtp6z7Aqn5LbVz, node 991:726.
const LOGO_SRC = "/fjarlaekningar-logo.png";
const LOGO_RATIO = 1920 / 660;

interface LogoProps {
  className?: string;
  /**
   * "dark" = full-color logo (cyan mark + black wordmark) for light backgrounds.
   * "light" = forced-white variant via CSS filter for dark backgrounds (e.g. footer).
   * TODO: replace the CSS filter with a dedicated white-on-transparent asset
   * once it's available in Figma.
   */
  variant?: "dark" | "light";
  /** Rendered height in pixels. Width is derived from the source aspect ratio. */
  height?: number;
}

export default function Logo({
  className = "",
  variant = "dark",
  height = 80,
}: LogoProps) {
  const width = Math.round(LOGO_RATIO * height);
  const filterClass =
    variant === "light" ? "brightness-0 invert" : "";

  return (
    <Image
      src={LOGO_SRC}
      alt="Fjarlækningar"
      width={width}
      height={height}
      priority
      className={`${filterClass} ${className}`.trim()}
      style={{ height, width: "auto" }}
    />
  );
}
