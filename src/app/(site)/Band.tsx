// A page band: one reorderable section of a marketing page.
//
// Why this exists: sections used to hardcode their own background, so the
// white/tint alternation was baked into the JSX order. The moment a section
// could be moved in the CMS, that broke — two white bands could end up
// adjacent with no division between them. The background is therefore derived
// from the band's *position*, not its identity, so the page keeps alternating
// correctly no matter how the sections are arranged.
//
// It also owns the shared container (max-w-7xl, matching the navbar and footer)
// so every band's left edge lines up by construction rather than by convention.

export default function Band({
  index,
  anchor,
  children,
  padding = "py-20",
}: {
  /** Position in the rendered order — decides the background. */
  index: number;
  /** Optional element id, for in-page links like /thjonusta#ferlid. */
  anchor?: string;
  children: React.ReactNode;
  padding?: string;
}) {
  const tinted = index % 2 === 1;
  return (
    <section
      id={anchor}
      className={`${padding} ${anchor ? "scroll-mt-20" : ""} ${
        tinted ? "bg-[var(--background)] border-y border-slate-200" : "bg-white"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">{children}</div>
    </section>
  );
}
