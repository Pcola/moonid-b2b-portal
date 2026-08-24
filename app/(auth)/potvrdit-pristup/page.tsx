import type { Metadata } from "next";
import { AuthPanel } from "@/components/auth/auth-panel";
import { AuthShell } from "@/components/auth/auth-shell";
import { AccessConfirmation } from "./access-confirmation";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Potvrdenie prístupu — Moonid B2B portál",
  robots: { index: false, follow: false },
};

export default function ConfirmAccessPage() {
  return (
    <AuthShell
      panel={
        <AuthPanel
          eyebrow="Bezpečný prístup"
          headline="Jedno vedomé potvrdenie. Žiadne prekvapenia."
          lead="Firemné e-mailové systémy odkazy často automaticky kontrolujú. Moonid preto jednorazový prístup aktivuje až po vašom kliknutí."
        />
      }
    >
      <AccessConfirmation />
    </AuthShell>
  );
}
