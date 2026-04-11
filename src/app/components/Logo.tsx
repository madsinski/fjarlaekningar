import { LOGO_MARK, LOGO_WORDMARK } from "./logo-paths";

interface LogoProps {
  className?: string;
  /**
   * "dark" = wordmark in foreground color (for light backgrounds, e.g. navbar).
   * "light" = wordmark in white (for dark backgrounds, e.g. footer).
   * The mark is always brand cyan in both variants, because the cyan is
   * the most recognizable piece of the brand and stays visible on either bg.
   */
  variant?: "dark" | "light";
  /**
   * Mark (cyan molecular cluster) height in px.
   * Tight-cropped viewBox is near-square, so width ≈ height.
   */
  markHeight?: number;
  /**
   * Wordmark ("Fjarlækningar") height in px.
   * Tight-cropped viewBox is 1181×193 (≈6.12:1), so width ≈ 6.12×height.
   */
  wordmarkHeight?: number;
}

export default function Logo({
  className = "",
  variant = "dark",
  markHeight = 40,
  wordmarkHeight = 24,
}: LogoProps) {
  const markWidth = Math.round(markHeight * LOGO_MARK.aspect);
  const wordmarkWidth = Math.round(wordmarkHeight * LOGO_WORDMARK.aspect);
  const wordmarkColor = variant === "light" ? "#ffffff" : "#1a1a1a";

  return (
    <span
      className={`inline-flex items-center gap-3 ${className}`.trim()}
      aria-label="Fjarlækningar"
      role="img"
    >
      <svg
        width={markWidth}
        height={markHeight}
        viewBox={LOGO_MARK.viewBox}
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        className="shrink-0"
      >
        <path fill="#00d6ff" fillRule="evenodd" d={LOGO_MARK.d} />
      </svg>
      <svg
        width={wordmarkWidth}
        height={wordmarkHeight}
        viewBox={LOGO_WORDMARK.viewBox}
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        className="shrink-0"
      >
        <path fill={wordmarkColor} fillRule="evenodd" d={LOGO_WORDMARK.d} />
      </svg>
    </span>
  );
}
