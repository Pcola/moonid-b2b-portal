"use client";

// Globálny error boundary (zachytáva chyby aj v root layoute) — musí renderovať <html>/<body>.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="sk">
      <body style={{ fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif", display: "grid", placeItems: "center", minHeight: "100vh", margin: 0, padding: 24, textAlign: "center", color: "#1a1a1a" }}>
        <div style={{ maxWidth: 420 }}>
          <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.18em", textTransform: "uppercase", color: "#163f38" }}>Moonid s.r.o.</div>
          <h1 style={{ fontSize: 34, margin: "16px 0 8px" }}>Niečo sa pokazilo</h1>
          <p style={{ color: "#6b7280", margin: "0 0 20px" }}>Vyskytla sa neočakávaná chyba.</p>
          <button onClick={reset} style={{ padding: "12px 22px", borderRadius: 10, background: "#163f38", color: "#fff", border: 0, fontSize: 15, fontWeight: 600, cursor: "pointer" }}>Skúsiť znova</button>
        </div>
      </body>
    </html>
  );
}
