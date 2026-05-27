import sanitizeHtml from "sanitize-html";

/**
 * Server-only HTML sanitizer powered by sanitize-html.
 * This file MUST only be imported from server-side code paths.
 *
 * Covers the main XSS attack vectors:
 * - <script> tags and their content
 * - event handlers (onclick, onload, onerror, etc.)
 * - javascript: / vbscript: / data: URLs in href/src
 * - <object>, <embed>, <base>, <meta> dangerous tags
 *
 * NOTE: This is a defense-in-depth measure. The primary content source
 * is owner-controlled Obsidian markdown, not arbitrary user input.
 */

const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    "a",
    "abbr",
    "b",
    "blockquote",
    "br",
    "code",
    "del",
    "em",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "hr",
    "i",
    "img",
    "li",
    "mark",
    "ol",
    "p",
    "pre",
    "s",
    "strong",
    "sub",
    "sup",
    "table",
    "tbody",
    "td",
    "th",
    "thead",
    "tr",
    "ul",
  ],
  allowedAttributes: {
    "*": ["class", "id"],
    a: ["href", "target", "rel"],
    img: ["src", "alt", "title"],
    td: ["colspan", "rowspan", "align", "valign"],
    th: ["colspan", "rowspan", "align", "valign"],
  },
  disallowedTagsMode: "discard",
  enforceHtmlBoundary: false,
};

/**
 * Sanitize HTML on the server side using sanitize-html.
 */
export function sanitizeHtmlServer(dirty: string): string {
  if (!dirty) return "";

  try {
    return sanitizeHtml(dirty, SANITIZE_OPTIONS);
  } catch (err) {
    console.error("[sanitize-server] Sanitization failed:", err);
    // Last resort: strip all tags
    return dirty.replace(/<[^>]*>?/gm, "");
  }
}
