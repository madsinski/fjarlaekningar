// Opening new stations — the checklist, the print run and the self-test supply.
//
// Fjarlækningar goes live one health centre at a time, and each opening repeats
// the same work: a day on site with the people who will field the calls, a fixed
// print run, and enough self-tests on the shelf that the first patient who asks
// for one does not leave empty-handed. This is that procedure, written down once
// so the second station does not depend on remembering how the first went.
//
// The shape is INSTITUTION → STATIONS, because that is how the health service is
// actually organised: HSU is one agreement and one set of contacts, but nine
// heilsugæslustöðvar that each need their own visit, print run and go-live date.
//
// State lives as a single JSONB row in `site_settings` (key `station_onboarding`)
// rather than its own table — it is one small document, edited by one or two
// admins, and this way opening a station needs no migration.

export type TaskState = { done: boolean; note?: string };

export type Contact = { name: string; role?: string; email?: string; phone?: string };

/** One heilsugæslustöð. */
export type Station = {
  id: string;
  /** Location, as the institution writes it — "Vestmannaeyjar", "Vík í Mýrdal". */
  name: string;
  /** Innleiðing — the day the service goes live here. ISO yyyy-mm-dd. */
  goLiveAt?: string;
  /** Who to call at this station. */
  contact: Contact;
  /** Checklist item id → state. */
  tasks: Record<string, TaskState>;
  /** Self-test key → packages currently on the shelf here. */
  stock: Record<string, number>;
  /** When the innleiðingarpakki was last emailed. ISO timestamp. */
  packageSentAt?: string;
  /**
   * The address it went to. Recorded next to the timestamp because the contact
   * can change afterwards, and "sent" then means nothing without knowing where.
   */
  packageSentTo?: string;
};

/** One institution — HSU, HSN and so on. */
export type Institution = {
  id: string;
  /** Full name, e.g. "Heilbrigðisstofnun Suðurlands". */
  name: string;
  /** What everyone actually calls it, e.g. "HSU". */
  short: string;
  /** The contact for the agreement itself, not for any one station. */
  contact: Contact;
  stations: Station[];
};

export type OnboardingState = {
  institutions: Institution[];
  /** Heilsa supplies every station, so the contact is held once. */
  supplier: Contact;
};

// ── The print run ───────────────────────────────────────────────────────────
// Every printed item lives in this one section, whatever size it is, because
// they are ordered, collected and carried to the station as one job.

/** Frames are bought off the shelf; the link is the exact product, not a search. */
export const JYSK_FRAME_30x40 =
  "https://jysk.is/stok-vara/OSCAR-myndarammi-30x40-cm-svartur-2/?PathId=756ec4ad-d612-4035-bf79-a6b31f35c580";
/** JYSK's frame category — pin the exact 40×50 product here once it is chosen. */
export const JYSK_FRAMES = "https://jysk.is/smavara/allt-a-vegginn/rammar/";

/** Where the artwork for every printable is produced. */
export const STUDIO = "/admin/presentations/collateral";

// ── Self-tests ──────────────────────────────────────────────────────────────

export const SELF_TESTS = [
  { key: "crp", label: "CRP-próf", ask: "CRP sjálfspróf" },
  { key: "strep", label: "Strep-próf", ask: "strep sjálfspróf" },
  { key: "urine", label: "Þvagstix", ask: "þvagstix" },
] as const;

/** Packages of each test a new station opens with. */
export const SELF_TEST_TARGET = 50;

/** Price to the patient, per package, whichever test it is. */
export const SELF_TEST_PRICE_ISK = 1400;

/**
 * How a self-test actually reaches a patient. Written out because the step that
 * goes wrong is the last one: if the test is not on the shelf the visit must
 * not end there.
 */
export const SELF_TEST_FLOW: string[] = [
  "Sjúklingur sendir erindi í sjúklingagátt og læknir metur hvort sjálfspróf þurfi.",
  "Sjúklingur kemur í móttöku og biður um prófið með nafni — til dæmis „CRP sjálfspróf“.",
  `Móttökuritari afhendir prófið og innheimtir ${SELF_TEST_PRICE_ISK.toLocaleString("is-IS")} kr.`,
  "Sé prófið ekki til á staðnum er sjúklingi vísað á vakthafandi hjúkrunarfræðing sem tekur prófið — sama gjald.",
  "Niðurstaðan er skráð í sjúklingagáttina og læknir klárar erindið.",
];

// ── The checklist ───────────────────────────────────────────────────────────

export type ChecklistItem = {
  id: string;
  label: string;
  detail?: string;
  /** Shown as a quantity chip, e.g. "4×" or "50×". */
  qty?: string;
  link?: string;
  linkLabel?: string;
};

export type ChecklistSection = {
  id: string;
  title: string;
  blurb?: string;
  items: ChecklistItem[];
};

export const CHECKLIST: ChecklistSection[] = [
  {
    id: "heimsokn",
    title: "Heimsókn á stöðina",
    blurb:
      "Einn dagur á staðnum áður en þjónustan opnar. Sest niður með hverjum hópi fyrir sig — það er fólkið sem svarar fyrstu spurningunum þegar sjúklingur hringir.",
    items: [
      { id: "visit_booked", label: "Dagsetning heimsóknar ákveðin við stöðina" },
      { id: "visit_nurses", label: "Setið með símahjúkrunarfræðingum" },
      { id: "visit_reception", label: "Setið með móttökuriturum" },
      { id: "visit_data", label: "Setið með heilbrigðisgagnafræðingum" },
      { id: "visit_doctors", label: "Setið með læknum" },
    ],
  },
  {
    id: "prentefni",
    title: "Prentefni",
    blurb: "Allt sem þarf að prenta og bera á staðinn, í einni ferð. Efnið sjálft er hannað í Efnisvinnslunni.",
    items: [
      {
        id: "poster_30x40",
        label: "Veggspjöld 30×40 cm",
        qty: "4×",
        detail: "Prentuð og sett í svartan ramma.",
        link: STUDIO,
        linkLabel: "Efnisvinnslan",
      },
      {
        id: "frame_30x40",
        label: "Svartir rammar 30×40 cm frá JYSK",
        qty: "4×",
        link: JYSK_FRAME_30x40,
        linkLabel: "OSCAR 30×40 svartur — jysk.is",
      },
      {
        id: "poster_40x50",
        label: "Veggspjöld 40×50 cm",
        qty: "4×",
        detail: "Prentuð og sett í svartan ramma.",
        link: STUDIO,
        linkLabel: "Efnisvinnslan",
      },
      {
        id: "frame_40x50",
        label: "Svartir rammar 40×50 cm frá JYSK",
        qty: "4×",
        link: JYSK_FRAMES,
        linkLabel: "Rammar — jysk.is",
      },
      {
        id: "poster_window",
        label: "A4 gluggaspjöld",
        qty: "4×",
        detail: "Í glugga í móttöku eða þar sem við á.",
        link: STUDIO,
        linkLabel: "Efnisvinnslan",
      },
      {
        id: "sheet_internal",
        label: "A4 verklagsblað fyrir starfsfólk",
        qty: "1×",
        detail: "Prentað og plastað.",
        link: STUDIO,
        linkLabel: "Efnisvinnslan",
      },
      {
        id: "sheet_selftest",
        label: "A4 leiðbeiningar fyrir móttökuritara um sjálfspróf",
        qty: "1×",
        detail: "Prentað og plastað. Hvernig prófin eru afhent, hvað þau kosta og hvað er gert ef þau eru ekki til.",
        link: STUDIO,
        linkLabel: "Efnisvinnslan",
      },
      {
        id: "fridge_cards",
        label: "A6 ísskápskort",
        qty: "50×",
        detail: "Prentuð tvíhliða og plastuð.",
        link: STUDIO,
        linkLabel: "Efnisvinnslan",
      },
    ],
  },
  {
    id: "sjalfsprof",
    title: "Sjálfspróf",
    blurb: `Stöðin opnar með ${SELF_TEST_TARGET} pakkningum af hverju prófi. Birgðastaðan er skráð hér að neðan.`,
    items: [
      { id: "stock_ordered", label: `Pantað frá Heilsu — ${SELF_TEST_TARGET}× af hverju prófi` },
      { id: "stock_delivered", label: "Afhent á stöðina og talið" },
      { id: "stock_contacts", label: "Tengiliðir staðfestir — stöðin og Heilsa" },
      { id: "stock_briefed", label: "Móttökuritarar upplýstir um ferlið og verðið" },
    ],
  },
];

export const ALL_ITEM_IDS = CHECKLIST.flatMap((s) => s.items.map((i) => i.id));

/**
 * HSU's own nine heilsugæslustöðvar, from its list of starfsstöðvar. Seeded so
 * the rollout starts as a real plan rather than an empty page; Vestmannaeyjar is
 * the pilot that is already live, leaving eight to open.
 */
export const HSU_STATIONS = [
  "Vestmannaeyjar",
  "Selfoss",
  "Hveragerði",
  "Þorlákshöfn",
  "Uppsveitir",
  "Rangárþing",
  "Vík í Mýrdal",
  "Kirkjubæjarklaustur",
  "Höfn í Hornafirði",
];

const slug = (s: string) =>
  s.toLowerCase().replace(/[^a-záðéíóúýþæö0-9]+/g, "-").replace(/^-|-$/g, "") || "stod";

/** A station that has just been added: nothing done, nothing on the shelf. */
export function newStation(name: string, id?: string): Station {
  return {
    id: id || `${slug(name)}-${Math.abs(hash(name))}`,
    name,
    contact: { name: "" },
    tasks: {},
    stock: Object.fromEntries(SELF_TESTS.map((t) => [t.key, 0])),
  };
}

/** Stable id from a name, so seeding twice does not duplicate a station. */
function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return h;
}

export function newInstitution(name: string, short: string, stations: string[] = []): Institution {
  return {
    id: `${slug(short || name)}-${Math.abs(hash(short || name))}`,
    name,
    short,
    contact: { name: "" },
    stations: stations.map((s) => newStation(s)),
  };
}

/**
 * Ids for copies. Names are derived from a hash, which is what stops seeding
 * twice from duplicating a station — but it also means two copies of the same
 * name would collide, so a copy gets a random id instead.
 */
const copyId = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 8)}`;

/** "Selfoss" → "Selfoss (afrit)", or "(afrit 2)" if that is taken. */
export function copyName(base: string, taken: string[]): string {
  const stem = base.trim() || "Ónefnd";
  const first = `${stem} (afrit)`;
  if (!taken.includes(first)) return first;
  for (let n = 2; ; n++) {
    const candidate = `${stem} (afrit ${n})`;
    if (!taken.includes(candidate)) return candidate;
  }
}

/**
 * A copy of a station, ready to stand on its own.
 *
 * Everything the admin entered comes along — contact, ticks, stock, date — on
 * the principle that "duplicate" should mean duplicate, and anything wrong is
 * one click from being corrected. The send record is the exception: it is not
 * bookkeeping but a record that an email actually went to a named address, and
 * carrying it over would make the new station claim a send that never happened.
 */
export function duplicateStation(s: Station, taken: string[]): Station {
  return {
    ...s,
    id: copyId(slug(s.name)),
    name: copyName(s.name, taken),
    tasks: { ...s.tasks },
    stock: { ...s.stock },
    contact: { ...s.contact },
    packageSentAt: undefined,
    packageSentTo: undefined,
  };
}

/** A copy of an institution and every station under it. */
export function duplicateInstitution(inst: Institution, taken: string[]): Institution {
  return {
    ...inst,
    id: copyId(slug(inst.short || inst.name)),
    name: inst.name,
    short: copyName(inst.short || inst.name, taken),
    contact: { ...inst.contact },
    // Station names are unique within the copy already, so each is duplicated
    // against its own growing list rather than the original's.
    stations: inst.stations.reduce<Station[]>((acc, s) => {
      acc.push({
        ...duplicateStation(s, acc.map((x) => x.name)),
        // Inside a fresh institution the original names are free again.
        name: s.name,
      });
      return acc;
    }, []),
  };
}

/** Share of the checklist done at one station, 0–1. */
export function progress(s: Station): number {
  const done = ALL_ITEM_IDS.filter((id) => s.tasks[id]?.done).length;
  return ALL_ITEM_IDS.length ? done / ALL_ITEM_IDS.length : 0;
}

/** Share of an institution's stations that are fully through the checklist. */
export function institutionProgress(inst: Institution): number {
  if (!inst.stations.length) return 0;
  return inst.stations.reduce((sum, s) => sum + progress(s), 0) / inst.stations.length;
}

/** Stations in innleiðing order; undated ones last, alphabetical within. */
export function timeline(inst: Institution): Station[] {
  return [...inst.stations].sort((a, b) => {
    if (a.goLiveAt && b.goLiveAt) return a.goLiveAt.localeCompare(b.goLiveAt);
    if (a.goLiveAt) return -1;
    if (b.goLiveAt) return 1;
    return a.name.localeCompare(b.name, "is");
  });
}

/** "2026-09-01" → "1. september 2026". Anything unparseable is returned as-is. */
export function formatDate(v?: string): string {
  if (!v) return "";
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v.trim());
  if (!m) return v;
  return new Intl.DateTimeFormat("is-IS", { day: "numeric", month: "long", year: "numeric" }).format(
    new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])),
  );
}

function contact(c: unknown, fallbackName = ""): Contact {
  const d = (c ?? {}) as Partial<Contact>;
  return { name: d.name ?? fallbackName, role: d.role, email: d.email, phone: d.phone };
}

/**
 * Tolerates a partial, legacy or hand-edited blob, so a bad row cannot break the
 * page. Understands the ORIGINAL flat shape — one level of "stations", each with
 * its own supplier contact — and lifts it into the institution → stations shape
 * without losing ticks, stock counts or contacts.
 */
export function mergeOnboarding(stored: unknown): OnboardingState {
  const raw = (stored ?? {}) as { institutions?: unknown; stations?: unknown; supplier?: unknown };

  const readStation = (s: unknown, i: number): Station | null => {
    const d = (s ?? {}) as Partial<Station> & { short?: string; place?: string; contacts?: { station?: unknown } };
    const name = d.name || d.short || d.place || "";
    if (!name) return null;
    const base = newStation(name, d.id || `station-${i}`);
    return {
      ...base,
      goLiveAt: d.goLiveAt,
      contact: contact(d.contact ?? d.contacts?.station),
      tasks: { ...(d.tasks ?? {}) },
      stock: { ...base.stock, ...(d.stock ?? {}) },
      packageSentAt: d.packageSentAt,
      packageSentTo: d.packageSentTo,
    };
  };

  let institutions: Institution[] = [];
  let supplier = contact(raw.supplier, "Heilsa");

  if (Array.isArray(raw.institutions) && raw.institutions.length) {
    institutions = raw.institutions
      .map((x): Institution | null => {
        const d = (x ?? {}) as Partial<Institution>;
        const name = d.name || d.short || "";
        if (!name) return null;
        const base = newInstitution(name, d.short || name);
        return {
          ...base,
          id: d.id || base.id,
          contact: contact(d.contact),
          stations: (Array.isArray(d.stations) ? d.stations : [])
            .map(readStation)
            .filter((s): s is Station => s !== null),
        };
      })
      .filter((x): x is Institution => x !== null);
  } else if (Array.isArray(raw.stations) && raw.stations.length) {
    // Legacy flat shape: each entry was an institution AND its only station.
    const legacy = raw.stations as (Partial<Station> & {
      short?: string;
      place?: string;
      contacts?: { station?: unknown; supplier?: unknown };
    })[];
    supplier = contact(legacy.find((s) => s.contacts?.supplier)?.contacts?.supplier, "Heilsa");
    institutions = legacy
      .map((s, idx): Institution | null => {
        const instName = s.name || s.short || "";
        if (!instName) return null;
        const inst = newInstitution(instName, s.short || instName);
        const station = readStation({ ...s, name: s.place || s.short || instName }, idx);
        return { ...inst, id: s.id || inst.id, stations: station ? [station] : [] };
      })
      .filter((x): x is Institution => x !== null);
  }

  // Seed HSU on the FIRST run only — when nothing has ever been stored. An
  // explicitly empty list is a choice (the last institution was deleted) and
  // must survive a reload; seeding on "empty" instead of "absent" would keep
  // resurrecting HSU the moment someone cleared the page.
  const neverStored = !Array.isArray(raw.institutions) && !Array.isArray(raw.stations);
  if (!institutions.length && neverStored) {
    institutions = [newInstitution("Heilbrigðisstofnun Suðurlands", "HSU", HSU_STATIONS)];
  }
  return { institutions, supplier };
}
