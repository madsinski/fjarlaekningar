// Pass-through. The chrome lives in the two locale groups below — (is) and en —
// because each of those knows its own language from the route tree, while a
// layout here would have to read the request to find out, and that alone would
// make every page dynamic.
export default function SiteLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <>{children}</>;
}
