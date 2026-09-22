'use client';

/** Last-resort boundary when the root layout itself fails. Plain HTML, inline styles. */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, background: '#f6f1e6', color: '#1e2230', fontFamily: 'Georgia, serif' }}>
        <main style={{ maxWidth: 520, margin: '15vh auto', padding: '0 24px' }}>
          <h1 style={{ fontSize: 32, lineHeight: 1.15 }}>Bibliotheca is having trouble</h1>
          <p style={{ fontFamily: 'system-ui, sans-serif', fontSize: 16, lineHeight: 1.6, color: '#545766' }}>
            The page couldn’t load. Try again in a moment.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{ marginTop: 16, padding: '10px 18px', background: '#1f4d3a', color: '#f6f1e6', border: 0, borderRadius: 4, fontSize: 15, cursor: 'pointer' }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
