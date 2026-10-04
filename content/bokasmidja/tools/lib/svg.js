"use strict";
// Bókasmiðjan — SVG sanitizer for model-drawn illustrations.
//
// The illustrator's SVG is injected into the page as markup so its parts can
// be animated and tapped. It is model output, so it is rebuilt here from an
// allowlist: unknown elements and attributes are dropped, nothing can load a
// remote resource or run script, and ids are namespaced per page so several
// pictures can share a document (the PDF export and the bookshelf do that).
Object.defineProperty(exports, "__esModule", { value: true });
exports.sanitizeSvg = sanitizeSvg;
const types_1 = require("./types");
const ELEMENTS = new Set([
    "svg", "g", "defs", "path", "rect", "circle", "ellipse", "line", "polyline", "polygon",
    "text", "tspan", "lineargradient", "radialgradient", "stop", "clippath", "mask", "use", "symbol",
    "pattern", "filter", "fegaussianblur", "feoffset", "femerge", "femergenode", "feflood",
    "fecomposite", "fedropshadow", "fecolormatrix", "feblend",
]);
// SVG is case-sensitive; the parser lowercases for the check and writes these back.
const CASED = {
    lineargradient: "linearGradient", radialgradient: "radialGradient", clippath: "clipPath",
    fegaussianblur: "feGaussianBlur", feoffset: "feOffset", femerge: "feMerge", femergenode: "feMergeNode",
    feflood: "feFlood", fecomposite: "feComposite", fedropshadow: "feDropShadow",
    fecolormatrix: "feColorMatrix", feblend: "feBlend",
};
const ATTRS = new Set([
    "id", "class", "d", "x", "y", "x1", "y1", "x2", "y2", "cx", "cy", "r", "rx", "ry", "width", "height",
    "points", "transform", "fill", "fill-opacity", "fill-rule", "stroke", "stroke-width", "stroke-linecap",
    "stroke-linejoin", "stroke-dasharray", "stroke-dashoffset", "stroke-opacity", "stroke-miterlimit",
    "opacity", "offset", "stop-color", "stop-opacity", "gradientUnits", "gradientTransform", "spreadMethod",
    "fx", "fy", "clip-path", "clip-rule", "clipPathUnits", "mask", "maskUnits", "filter", "filterUnits",
    "href", "viewBox", "preserveAspectRatio", "patternUnits", "patternTransform", "font-size", "font-weight",
    "font-family", "text-anchor", "dominant-baseline", "letter-spacing", "dx", "dy", "stdDeviation", "in",
    "in2", "result", "flood-color", "flood-opacity", "operator", "mode", "values", "type",
    "data-anim", "data-tap",
]);
const ATTR_BY_LOWER = new Map([...ATTRS].map((a) => [a.toLowerCase(), a]));
const ID_REF_ATTRS = new Set(["fill", "stroke", "clip-path", "mask", "filter"]);
const MAX_SVG_BYTES = 400_000;
const escAttr = (v) => v.replace(/&(?!(amp|lt|gt|quot|#\d+|#x[0-9a-f]+);)/gi, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
const escText = (v) => v.replace(/&(?!(amp|lt|gt|quot|#\d+|#x[0-9a-f]+);)/gi, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const safeId = (v) => v.replace(/[^A-Za-z0-9_-]/g, "");
function cleanAttr(name, raw, prefix) {
    const value = raw.trim();
    if (/javascript:|data:|expression\(|@import|<|>/i.test(value))
        return null;
    if (name === "id") {
        const id = safeId(value);
        return id ? `${prefix}${id}` : null;
    }
    if (name === "href") {
        const id = value.startsWith("#") ? safeId(value.slice(1)) : "";
        return id ? `#${prefix}${id}` : null;
    }
    if (name === "data-anim")
        return types_1.ANIMS.includes(value) ? value : null;
    if (name === "data-tap")
        return types_1.TAPS.includes(value) ? value : null;
    if (name === "class")
        return value.replace(/[^A-Za-z0-9_ -]/g, "") || null;
    if (/url\(/i.test(value)) {
        // Only local paint-server references: url(#id)
        if (!ID_REF_ATTRS.has(name))
            return null;
        const m = /^url\(\s*['"]?#([^'")\s]+)['"]?\s*\)$/i.exec(value);
        const id = m ? safeId(m[1]) : "";
        return id ? `url(#${prefix}${id})` : null;
    }
    return value;
}
/**
 * Returns safe SVG markup with the standard viewBox, or null when the input
 * holds no usable <svg>. `prefix` namespaces every id (use a short page key).
 */
function sanitizeSvg(input, prefix) {
    const start = input.search(/<svg[\s>]/i);
    const end = input.toLowerCase().lastIndexOf("</svg>");
    if (start < 0 || end < start)
        return null;
    const src = input.slice(start, end + 6)
        .replace(/<!--[\s\S]*?-->/g, "")
        .replace(/<!\[CDATA\[[\s\S]*?\]\]>/g, "")
        .replace(/<(script|style|foreignObject|iframe|animate\w*|set|image|a)\b[\s\S]*?<\/\1\s*>/gi, "");
    if (src.length > MAX_SVG_BYTES)
        return null;
    const idp = `${safeId(prefix)}-`;
    const out = [];
    const open = [];
    const tagRe = /<(\/?)([A-Za-z][\w:-]*)((?:\s+[\w:-]+(?:\s*=\s*(?:"[^"]*"|'[^']*'))?)*)\s*(\/?)>|([^<]+)|</g;
    let m;
    let skipDepth = 0; // inside a dropped element: drop its children too
    let shapes = 0;
    while ((m = tagRe.exec(src))) {
        if (m[5] !== undefined) {
            // Text only matters inside <text>/<tspan>.
            const top = open[open.length - 1];
            if (!skipDepth && (top === "text" || top === "tspan"))
                out.push(escText(m[5]));
            continue;
        }
        if (!m[2])
            continue;
        const closing = m[1] === "/";
        const lower = m[2].toLowerCase();
        const selfClosing = m[4] === "/";
        const allowed = ELEMENTS.has(lower);
        if (closing) {
            if (skipDepth) {
                skipDepth--;
                continue;
            }
            if (!allowed)
                continue;
            const at = open.lastIndexOf(lower);
            if (at < 0)
                continue;
            while (open.length > at) {
                const t = open.pop();
                out.push(`</${CASED[t] ?? t}>`);
            }
            continue;
        }
        if (skipDepth) {
            if (!selfClosing)
                skipDepth++;
            continue;
        }
        if (!allowed) {
            if (!selfClosing)
                skipDepth = 1;
            continue;
        }
        const name = CASED[lower] ?? lower;
        const attrs = [];
        if (lower === "svg" && open.length === 0) {
            attrs.push('xmlns="http://www.w3.org/2000/svg"', `viewBox="0 0 ${types_1.ART_W} ${types_1.ART_H}"`, 'preserveAspectRatio="xMidYMid meet"');
        }
        else {
            const attrRe = /([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
            let a;
            const seen = new Set();
            while ((a = attrRe.exec(m[3] || ""))) {
                const key = ATTR_BY_LOWER.get(a[1].replace(/^xlink:/i, "").toLowerCase());
                if (!key || seen.has(key))
                    continue;
                const v = cleanAttr(key, a[2] ?? a[3] ?? "", idp);
                if (v === null)
                    continue;
                seen.add(key);
                attrs.push(`${key}="${escAttr(v)}"`);
            }
            shapes++;
        }
        out.push(`<${name}${attrs.length ? " " + attrs.join(" ") : ""}${selfClosing ? "/" : ""}>`);
        if (!selfClosing)
            open.push(lower);
    }
    while (open.length) {
        const t = open.pop();
        out.push(`</${CASED[t] ?? t}>`);
    }
    const svg = out.join("");
    return shapes >= 3 && svg.startsWith("<svg") ? svg : null;
}
