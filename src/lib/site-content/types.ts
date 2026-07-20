// Shared types for the website CMS.
//
// Every editable page declares a list of fields; the CMS stores per-locale
// overrides as { is: {key:value}, en: {key:value} } and the public page renders
// a flattened map (locale → Icelandic → built-in default).

export type FieldType =
  | "text"      // single-line
  | "textarea"  // multi-line
  | "heading"   // single-line, supports ==word== brand-blue highlighting
  | "icon";     // value is a key from ICON_KEYS (see icons.ts)

export interface SiteField {
  key: string;
  label: string;
  group: string;
  type: FieldType;
}

export type Locale = "is" | "en";
export type LocaleContent = Record<string, string>;

export interface SiteContentBlob {
  is?: LocaleContent;
  en?: LocaleContent;
}

/**
 * Flatten a stored { is, en } blob for one locale, falling back:
 * locale value → Icelandic value → built-in Icelandic default.
 * So an untranslated English page shows Icelandic rather than blanks, and an
 * empty CMS reproduces the original hard-coded page exactly.
 */
export function resolveFields(
  fields: SiteField[],
  defaultsIs: LocaleContent,
  content: SiteContentBlob | null | undefined,
  locale: Locale,
): LocaleContent {
  const loc = content?.[locale] ?? {};
  const is = content?.is ?? {};
  const out: LocaleContent = {};
  for (const f of fields) {
    out[f.key] = loc[f.key]?.trim()
      ? loc[f.key]
      : is[f.key]?.trim()
        ? is[f.key]
        : defaultsIs[f.key] ?? "";
  }
  return out;
}

/** English defaults are always empty — Mads translates (or uses Þýða). */
export function emptyDefaults(fields: SiteField[]): LocaleContent {
  return Object.fromEntries(fields.map((f) => [f.key, ""]));
}
