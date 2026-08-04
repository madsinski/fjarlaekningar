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

  // Combined: not the two split blocks stacked, but one composed unit.
  //
  //   intro          the section's own heading and lead, left-aligned and
  //                  narrow, so the eye starts on words rather than a slab.
  //   group photo    promoted from sidebar illustration to a wide banner —
  //                  the anchor of the section, height-capped and focused
  //                  above centre so faces survive the crop.
  //   panel          a white card of individual portraits, inset and pulled up
  //                  over the banner's lower edge. The overlap is what makes
  //                  the two halves one object: "here we all are" resolving
  //                  into "and here is each of us".
  //
  // The portraits drop their card chrome here (see TeamGrid's variant): inside
  // a white panel, a second set of white card edges is noise, and bare
  // portraits echo the group photo above instead of competing with it.
  const combinedTeamBlock = (
    <div>
      <div className="max-w-2xl">
        <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">
          {renderHighlighted(c.faces_heading)}
        </h2>
        {c.faces_body && (
          <p className="mt-5 text-lg text-slate-600 leading-relaxed">{c.faces_body}</p>
        )}
      </div>

      <div className="mt-10 sm:mt-12">
        {c.faces_photo && (
          <figure className="relative">
            {/* Height-capped so a 3:2 group photo reads as a banner rather than
                a wall, and focused above centre: in a group shot the faces sit
                in the top half, so a centred crop trims heads and keeps floor. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={c.faces_photo}
              alt={c.faces_heading || "Teymið"}
              className="w-full max-h-[560px] rounded-3xl object-cover object-[center_22%] shadow-lg ring-1 ring-slate-200"
            />
            {/* Seats the panel on the photo instead of letting it float. */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 rounded-b-3xl bg-gradient-to-t from-slate-900/25 to-transparent"
            />
            {c.faces_caption && (
              // On the image, not under it — the panel below covers that edge.
              <figcaption className="absolute right-4 top-4 rounded-full bg-slate-900/50 px-3 py-1 text-[11px] font-medium text-white backdrop-blur-sm">
                {c.faces_caption}
              </figcaption>
            )}
          </figure>
        )}

        {teamMembers.length > 0 && (
          <div
            className={`relative z-10 rounded-3xl bg-white p-6 shadow-xl ring-1 ring-slate-200 sm:p-9 lg:p-10 ${
              c.faces_photo ? "-mt-10 mx-3 sm:-mt-14 sm:mx-8 lg:-mt-20 lg:mx-14" : ""
            }`}
          >
            <div className="mb-8 flex flex-col gap-3 lg:mb-10 lg:flex-row lg:items-end lg:justify-between">
              <h3 className="text-xl sm:text-2xl font-bold text-slate-900">
                {renderHighlighted(c.team_heading)}
              </h3>
              {c.team_body && (
                <p className="text-sm text-slate-600 leading-relaxed lg:max-w-sm">{c.team_body}</p>
              )}
            </div>
            <TeamGrid members={teamMembers} locale={locale} variant="portraits" />
            {c.team_footer && (
              <p className="mt-9 border-t border-slate-200 pt-5 text-sm text-slate-500">
                {c.team_footer}
              </p>
            )}
          </div>
        )}
      </div>
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
