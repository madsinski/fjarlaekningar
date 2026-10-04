// Bókasmiðjan — shared types and constants (safe for client and server).

export const LANGS = ["en", "is", "nb", "hu"] as const;
export type Lang = (typeof LANGS)[number];
export const isLang = (v: unknown): v is Lang => typeof v === "string" && (LANGS as readonly string[]).includes(v);

export const LANG_NAMES: Record<Lang, string> = { en: "English", is: "Íslenska", nb: "Norsk", hu: "Magyar" };
export const LANG_FLAGS: Record<Lang, string> = { en: "🇬🇧", is: "🇮🇸", nb: "🇳🇴", hu: "🇭🇺" };
/** BCP-47 tags for the browser's speech synthesis fallback. */
export const LANG_BCP47: Record<Lang, string> = { en: "en-GB", is: "is-IS", nb: "nb-NO", hu: "hu-HU" };
/** English language names, for prompts. */
export const LANG_ENGLISH: Record<Lang, string> = { en: "English", is: "Icelandic", nb: "Norwegian Bokmål", hu: "Hungarian" };

export const LANG_COOKIE = "bk_lang";

export type I18nText = Partial<Record<Lang, string>>;

/** 1 short, 2 medium, 3 long. */
export type StoryLength = 1 | 2 | 3;
export const LENGTH_KEYS = ["short", "medium", "long"] as const;
export type LengthKey = (typeof LENGTH_KEYS)[number];

/** Best available text: the wanted language, then English, then anything. */
export function pick(text: I18nText | null | undefined, lang: Lang): string {
  if (!text) return "";
  return text[lang] || text.en || text.is || text.nb || text.hu || "";
}

export const AVATARS: Record<string, string> = {
  fox: "🦊", bear: "🐻", whale: "🐳", dragon: "🐲", unicorn: "🦄", robot: "🤖",
  lion: "🦁", owl: "🦉", puffin: "🐧", rocket: "🚀", dino: "🦖", cat: "🐱",
};
export const COLORS = ["#f97316", "#ef4444", "#ec4899", "#8b5cf6", "#3b82f6", "#06b6d4", "#10b981", "#eab308"];

export interface Child {
  id: string;
  name: string;
  avatar: string;
  color: string;
  lang: Lang;
  age: number | null;
}

export type Viewer = { role: "parent"; child: null } | { role: "kid"; child: Child };

export interface PageView {
  id: string;
  position: number;
  text: I18nText;
  /** Texts of the medium and long versions, where they differ from the shorter one. */
  textM?: I18nText;
  textL?: I18nText;
  /** The shortest version this page appears in: 1 short, 2 medium, 3 long. */
  level: StoryLength;
  svg: string | null;
  /** Which comes first on the page: the picture or the text. */
  layout: "art-first" | "text-first";
  /** May the workshop paint this page by itself when the picture is missing? */
  autoArt: boolean;
  /** The child uploaded a drawing for this page. */
  hasDrawing: boolean;
  /** The illustrator has looked at this picture and corrected it (or it is hand-made). */
  reviewed: boolean;
}

export interface StoryView {
  id: string;
  bookId: string;
  position: number;
  status: "idea" | "written" | "ready";
  sourceLang: Lang;
  title: I18nText;
  summary: I18nText;
  createdBy: string | null;
  authorName: string | null;
  cover: string | null;
  /** The Icelandic text has been through the proofreading step. */
  polishedIs?: boolean;
  /** Longest version the story has: 1 (one length only) or 3 (short, medium and long). */
  lengths: number;
  /** The characters have been designed (a character sheet exists). */
  hasSheet?: boolean;
  /** How the app paints new pictures for this story: generated images, or drawn SVG. */
  artMode?: "image" | "svg";
  pages?: PageView[];
}

export interface BookView {
  id: string;
  title: I18nText;
  subtitle: I18nText;
  color: string;
  emoji: string;
  plannedStories: number;
  createdBy: string | null;
  /** Cover picture drawn by the illustrator. */
  coverSvg: string | null;
  /** A finished cover image was uploaded (served by /api/bokasmidja/books/:id/cover). */
  coverImage: string | null;
  stories: StoryView[];
}

export type Idea =
  | { kind: "prompt"; text: string; length?: LengthKey }
  | { kind: "wizard"; answers: Record<string, string>; heroName: string; extra: string; length?: LengthKey };

export const MAX_PAGES = 26;
export const MAX_STORIES = 30;

/** Illustration canvas. Every page picture uses this viewBox. */
export const ART_W = 1200;
export const ART_H = 900;

export const ANIMS = ["float", "swim", "bob", "sway", "wiggle", "spin", "pulse", "twinkle", "blink", "drift"] as const;
export const TAPS = ["jump", "spin", "wiggle", "grow", "splash", "hide"] as const;

/** The pages of one version of a story: a page shows in every version at or above its level. */
export function pagesFor<P extends { level: StoryLength }>(pages: P[], length: StoryLength): P[] {
  return pages.filter((p) => p.level <= length);
}

/** Which stored text a page uses in a version: its own, or the next shorter one. Returns the length it came from. */
export function textSource(p: Pick<PageView, "text" | "textM" | "textL">, lang: Lang, length: StoryLength): StoryLength {
  if (length >= 3 && p.textL?.[lang]) return 3;
  if (length >= 2 && p.textM?.[lang]) return 2;
  return 1;
}

/** A page's text in a language for a version ("" when it has none). */
export function pageText(p: Pick<PageView, "text" | "textM" | "textL">, lang: Lang, length: StoryLength): string {
  const from = textSource(p, lang, length);
  return (from === 3 ? p.textL?.[lang] : from === 2 ? p.textM?.[lang] : p.text[lang]) || "";
}

/** Narrators for the read-aloud. Each has its own recording of every page. */
export const NARRATORS = ["storyteller", "hero", "gentle"] as const;
export type Narrator = (typeof NARRATORS)[number];
export const isNarrator = (v: unknown): v is Narrator => typeof v === "string" && (NARRATORS as readonly string[]).includes(v);
