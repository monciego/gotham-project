/** Styles for editor and rendered entries alike, so both look the same. */
export const RICH_TEXT_CLASS = [
  "text-base leading-relaxed",
  "[&_p]:my-2 first:[&_p]:mt-0",
  "[&_h2]:mt-5 [&_h2]:mb-2 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:tracking-tight",
  "[&_h3]:mt-4 [&_h3]:mb-1.5 [&_h3]:text-lg [&_h3]:font-semibold",
  "[&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:my-0.5 [&_li_p]:my-0",
  "[&_strong]:font-semibold [&_blockquote]:border-l-2 [&_blockquote]:border-primary/50 [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground",
].join(" ");

/** True when the HTML has no words, like the editor's empty "<p></p>". */
export function isBlank(html: string): boolean {
  return html.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim() === "";
}
