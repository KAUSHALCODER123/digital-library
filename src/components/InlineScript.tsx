/**
 * Runs synchronously while the HTML is parsed (before first paint). On the client the tag is
 * inert (`text/plain`) so React doesn't warn and the script never runs twice.
 */
export function InlineScript({ html }: { html: string }) {
  return (
    <script
      type={typeof window === 'undefined' ? 'text/javascript' : 'text/plain'}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
