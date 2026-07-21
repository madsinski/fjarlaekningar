// Custom icons, for concepts lucide doesn't cover.
//
// lucide has 1,986 icons and no mouth, throat, tonsil or dental one — the
// nearest candidates ("speech", "smile") are a speech bubble and a smiley face,
// neither of which reads as "open your mouth for a throat swab". So the strep
// test gets a hand-drawn one.
//
// Drawn to lucide's conventions so it sits correctly beside the real ones:
// 24×24 viewBox, no fill, currentColor stroke, round caps and joins, and a
// caller-supplied strokeWidth. Anything here is selectable in the CMS icon
// picker exactly like a lucide name.

export type CustomIconProps = {
  className?: string;
  strokeWidth?: number;
};

function OpenMouth({ className, strokeWidth = 1.75 }: CustomIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      {/* Mouth opening, viewed front-on as in a throat exam. */}
      <ellipse cx="12" cy="12" rx="9" ry="6.5" />
      {/* Tongue. */}
      <path d="M6 14.4c1.7 2.1 10.3 2.1 12 0" />
      {/* Uvula, hanging from the soft palate — the detail that makes this read
          as a throat rather than a pair of lips. */}
      <path d="M12 5.6v2.2" />
    </svg>
  );
}

export const CUSTOM_ICONS: Record<string, (p: CustomIconProps) => React.ReactElement> = {
  "open-mouth": OpenMouth,
};

export const CUSTOM_ICON_NAMES = Object.keys(CUSTOM_ICONS);

export function isCustomIconName(name: string | undefined): name is string {
  return !!name && name in CUSTOM_ICONS;
}
