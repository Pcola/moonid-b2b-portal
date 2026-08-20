"use client";

import { useState, useSyncExternalStore } from "react";

// verzia cookie politiky — pri zmene textu zvýš → banner sa zobrazí znova
const CONSENT_VERSION = 1;
const subscribe = () => () => {};

function needsCookieNotice(): boolean {
  try {
    const raw = localStorage.getItem("moonid_cookies");
    const record = raw ? JSON.parse(raw) : null;
    return !record || record.v !== CONSENT_VERSION;
  } catch {
    return true;
  }
}

export function CookieBanner() {
  const shouldShow = useSyncExternalStore(subscribe, needsCookieNotice, () => false);
  const [dismissed, setDismissed] = useState(false);

  if (!shouldShow || dismissed) return null;

  return (
    <div
      role="dialog"
      aria-label="Súbory cookie"
      className="fixed bottom-4 left-4 right-4 z-[100] flex max-w-[460px] flex-col gap-3 rounded-[14px] border border-line bg-white p-5"
      style={{ boxShadow: "0 16px 44px -14px rgba(16,34,29,0.35)" }}
    >
      <p className="text-[13.5px] leading-relaxed text-muted-3">
        Používame iba nevyhnutné súbory cookie pre správne fungovanie webu.{" "}
        <a href="/cookies" className="font-semibold text-brand underline underline-offset-2">Viac informácií</a>.
      </p>
      <div>
        <button
          onClick={() => {
            // Potvrdenie zobrazenia informačného oznamu; nejde o súhlas s nevyhnutnými cookies.
            try { localStorage.setItem("moonid_cookies", JSON.stringify({ v: CONSENT_VERSION, ts: new Date().toISOString() })); } catch {}
            setDismissed(true);
          }}
          className="rounded-[9px] bg-brand px-[18px] py-2.5 text-[14px] font-semibold text-white transition hover:bg-brand-2"
        >
          Rozumiem
        </button>
      </div>
    </div>
  );
}
