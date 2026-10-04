"use strict";
// Bókasmiðjan — shared types and constants (safe for client and server).
Object.defineProperty(exports, "__esModule", { value: true });
exports.TAPS = exports.ANIMS = exports.ART_H = exports.ART_W = exports.MAX_STORIES = exports.MAX_PAGES = exports.COLORS = exports.AVATARS = exports.LANG_COOKIE = exports.LANG_ENGLISH = exports.LANG_BCP47 = exports.LANG_FLAGS = exports.LANG_NAMES = exports.isLang = exports.LANGS = void 0;
exports.pick = pick;
exports.LANGS = ["en", "is", "nb", "hu"];
const isLang = (v) => typeof v === "string" && exports.LANGS.includes(v);
exports.isLang = isLang;
exports.LANG_NAMES = { en: "English", is: "Íslenska", nb: "Norsk", hu: "Magyar" };
exports.LANG_FLAGS = { en: "🇬🇧", is: "🇮🇸", nb: "🇳🇴", hu: "🇭🇺" };
/** BCP-47 tags for the browser's speech synthesis fallback. */
exports.LANG_BCP47 = { en: "en-GB", is: "is-IS", nb: "nb-NO", hu: "hu-HU" };
/** English language names, for prompts. */
exports.LANG_ENGLISH = { en: "English", is: "Icelandic", nb: "Norwegian Bokmål", hu: "Hungarian" };
exports.LANG_COOKIE = "bk_lang";
/** Best available text: the wanted language, then English, then anything. */
function pick(text, lang) {
    if (!text)
        return "";
    return text[lang] || text.en || text.is || text.nb || text.hu || "";
}
exports.AVATARS = {
    fox: "🦊", bear: "🐻", whale: "🐳", dragon: "🐲", unicorn: "🦄", robot: "🤖",
    lion: "🦁", owl: "🦉", puffin: "🐧", rocket: "🚀", dino: "🦖", cat: "🐱",
};
exports.COLORS = ["#f97316", "#ef4444", "#ec4899", "#8b5cf6", "#3b82f6", "#06b6d4", "#10b981", "#eab308"];
exports.MAX_PAGES = 20;
exports.MAX_STORIES = 30;
/** Illustration canvas. Every page picture uses this viewBox. */
exports.ART_W = 1200;
exports.ART_H = 900;
exports.ANIMS = ["float", "swim", "bob", "sway", "wiggle", "spin", "pulse", "twinkle", "blink", "drift"];
exports.TAPS = ["jump", "spin", "wiggle", "grow", "splash", "hide"];
