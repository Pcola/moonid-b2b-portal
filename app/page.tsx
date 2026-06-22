export default function Home() {
  return (
    <main style={{ maxWidth: 680, margin: "0 auto", padding: "4rem 1.5rem" }}>
      <h1
        style={{
          fontFamily: "Newsreader, Georgia, serif",
          fontSize: 34,
          fontWeight: 500,
          letterSpacing: "-0.02em",
        }}
      >
        moonid
      </h1>
      <p style={{ color: "var(--muted)", marginTop: 8 }}>
        B2B portál — skeleton beží. Stavia sa podľa{" "}
        <code>docs/BUILD_BLUEPRINT.md</code>.
      </p>
      <ul style={{ marginTop: 24, lineHeight: 2 }}>
        <li>
          <a href="/login">Prihlásenie</a> <span style={{ color: "var(--muted)" }}>(Fáza 2)</span>
        </li>
        <li>
          <a href="/dashboard">Nástenka</a> <span style={{ color: "var(--muted)" }}>(Fáza 2)</span>
        </li>
      </ul>
    </main>
  );
}
