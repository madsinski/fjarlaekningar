import SiteChrome from "../SiteChrome";

// Icelandic pages. A route group, so the URLs are unchanged: this is still
// /thjonusta, not /is/thjonusta.
export default function IsLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <SiteChrome locale="is">{children}</SiteChrome>;
}
