import PortalButton from "../../components/PortalButton";
import TeamGrid from "../../components/TeamGrid";
import PageHero from "../PageHero";
import Band from "../Band";
import SiteIcon from "@/lib/site-content/SiteIcon";
import { renderHighlighted } from "@/lib/site-content/highlight";
import { umOkkurSections, isCombinedTeam, TEAM_MEMBER_SLOTS } from "@/lib/site-content/um-okkur";
import { resolveOrder, type LocaleContent } from "@/lib/site-content/types";

// Presentational Um okkur page.
//
// Each band's *content* is declared below; the <section> wrapper, container and
// background come from <Band>, which derives the background from the band's
// position. That is what lets the CMS reorder sections without breaking the
// white/tint alternation. Empty bands are dropped before indices are assigned,
// so a hidden section never leaves a gap in the rhythm either.
export default function UmOkkurView({
  c,
  order,
  locale = "is",
}: {
  c: LocaleContent;
  order?: string[];
  /** For TeamGrid's static roles/flags — CMS strings in `c` are already resolved. */
  locale?: "is" | "en";
}) {
  // Team members come from the numbered CMS slots, already resolved for the
  // current locale. Empty slots (no name or no photo) are dropped so a blank
  // slot never renders an empty card.
  const teamMembers = Array.from({ length: TEAM_MEMBER_SLOTS }, (_, k) => {
    const i = k + 1;
    return {
      name: c[`t${i}_name`] ?? "",
      role: c[`t${i}_role`] ?? "",
      flag: c[`t${i}_flag`] ?? "",
      photo: c[`t${i}_photo`] ?? "",
    };
  }).filter((m) => m.name.trim() && m.photo.trim());

  const pillars = [
    { title: c.p1_title, body: c.p1_body, icon: c.p1_icon, fallback: "target" },
    { title: c.p2_title, body: c.p2_body, icon: c.p2_icon, fallback: "lock" },
    { title: c.p3_title, body: c.p3_body, icon: c.p3_icon, fallback: "stethoscope" },
    { title: c.p4_title, body: c.p4_body, icon: c.p4_icon, fallback: "clipboard-plus" },
  ];
  const values = [
    { title: c.v1_title, body: c.v1_body, icon: c.v1_icon, fallback: "globe" },
    { title: c.v2_title, body: c.v2_body, icon: c.v2_icon, fallback: "shield-check" },
    { title: c.v3_title, body: c.v3_body, icon: c.v3_icon, fallback: "award" },
    { title: c.v4_title, body: c.v4_body, icon: c.v4_icon, fallback: "sparkles" },
  ];

  // The group photo, shared by both team layouts. Only the column span differs
  // between them, so it takes it as an argument rather than being duplicated.
  const groupPhoto = (className: string) =>
    c.faces_photo ? (
      <figure className={className}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={c.faces_photo}
          alt={c.faces_heading || "Teymið"}
          className="w-full rounded-3xl object-cover shadow-lg ring-1 ring-slate-200"
        />
        {c.faces_caption && (
          <figcaption className="mt-3 text-sm text-slate-500">{c.faces_caption}</figcaption>
        )}
      </figure>
    ) : null;

  // The team grid plus its footnote — identical in both layouts.
  const teamGrid = (
    <>
      <TeamGrid members={teamMembers} locale={locale} />
      {c.team_footer && <p className="mt-10 text-sm text-slate-500">{c.team_footer}</p>}
    </>
  );

  // Split (default): the group photo and its copy stand alone in their own band.
  const facesBlock = (
    <div className="grid lg:grid-cols-5 gap-8 lg:gap-12 items-center">
      <div className={c.faces_photo ? "lg:col-span-2" : "lg:col-span-5 max-w-2xl"}>
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">
          {renderHighlighted(c.faces_heading)}
        </h2>
        {c.faces_body && <p className="mt-4 text-slate-600 leading-relaxed">{c.faces_body}</p>}
      </div>
      {groupPhoto("lg:col-span-3")}
    </div>
  );

  // Combined: one band, read top to bottom — the group photo and its copy set
  // the scene, a rule breaks the band in two, then the same team grid follows
  // under a secondary heading. The rule (rather than a second background) is
  // what keeps it one section: <Band>'s white/tint alternation still applies to
  // the band as a whole, so the page rhythm is unchanged.
  const combinedTeamBlock = (
    <div>
      {facesBlock}
      {teamMembers.length > 0 && (
        <div className="mt-14 pt-12 border-t border-slate-200 lg:mt-16 lg:pt-14">
          <div className="max-w-2xl mb-10">
            <h3 className="text-xl sm:text-2xl font-bold text-slate-900">
              {renderHighlighted(c.team_heading)}
            </h3>
            {c.team_body && <p className="mt-3 text-slate-600">{c.team_body}</p>}
          </div>
          {teamGrid}
        </div>
      )}
    </div>
  );

  const combined = isCombinedTeam(c);

  const blocks: Record<string, React.ReactNode> = {
    // In combined mode the merged block takes this slot and the separate
    // "team" band below is dropped, so the two never render twice.
    faces: combined ? combinedTeamBlock : facesBlock,

    pillars: (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {pillars.map((p) => (
          <div
            key={p.title}
            className="group bg-white rounded-2xl border border-slate-200 p-8 hover:shadow-lg hover:border-brand-cyan transition-all"
          >
            <div className="w-12 h-12 rounded-2xl bg-brand-cyan-subtle text-[var(--primary-dark)] flex items-center justify-center mb-5 group-hover:bg-[var(--primary)] group-hover:text-white transition-colors">
              <SiteIcon name={p.icon} fallback={p.fallback} className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">{p.title}</h2>
            <p className="text-slate-600 leading-relaxed">{p.body}</p>
          </div>
        ))}
      </div>
    ),

    values: (
      <>
        <div className="max-w-2xl mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">
            {renderHighlighted(c.values_heading)}
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {values.map((v) => (
            <div key={v.title} className="bg-white rounded-2xl border border-slate-200 p-6">
              <div className="w-11 h-11 rounded-xl bg-brand-cyan-subtle text-[var(--primary-dark)] flex items-center justify-center mb-4">
                <SiteIcon name={v.icon} fallback={v.fallback} className="w-5 h-5" />
              </div>
              <h3 className="text-base font-semibold text-slate-900 mb-1.5">{v.title}</h3>
              <p className="text-sm text-slate-600 leading-relaxed">{v.body}</p>
            </div>
          ))}
        </div>
      </>
    ),

    ...(combined
      ? {}
      : {
          team: (
            <>
              <div className="max-w-2xl mb-12">
                <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">
                  {renderHighlighted(c.team_heading)}
                </h2>
                {c.team_body && <p className="mt-4 text-slate-600">{c.team_body}</p>}
              </div>
              {teamGrid}
            </>
          ),
        }),

    cta: <PortalButton size="lg" label={c.cta_button} />,
  };

  const visible = resolveOrder(umOkkurSections(c), order ? { order } : null).filter(
    (id) => blocks[id],
  );

  return (
    <>
      <PageHero c={c} />
      {visible.map((id, i) => (
        <Band key={id} index={i}>
          {blocks[id]}
        </Band>
      ))}
    </>
  );
}
