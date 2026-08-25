"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";

type ToastTone = "status" | "error";
type ToastItem = { id: number; msg: string; tone: ToastTone };
const ToastCtx = createContext<(msg: string, tone?: ToastTone) => void>(() => {});

/** Globálny toast na potvrdenia akcií (napr. „Pridané do košíka"). Kontajner je vždy v DOM
 *  s role="status" aria-live="polite" → zmena sa oznámi aj čítaču obrazovky (WCAG 4.1.3). */
export function useToast() {
  return useContext(ToastCtx);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const idRef = useRef(0);
  const push = useCallback((msg: string, tone: ToastTone = "status") => {
    const id = ++idRef.current;
    setToasts((t) => [...t, { id, msg, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), tone === "error" ? 6000 : 2600);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-5 z-[120] flex flex-col items-center gap-2 px-4"
        role="status"
        aria-live="polite"
      >
        {toasts.filter((t) => t.tone === "status").map((t) => (
          <div
            key={t.id}
            className="pointer-events-auto flex items-center gap-2.5 rounded-[12px] bg-brand px-4 py-2.5 text-[14px] font-semibold text-white shadow-[0_10px_30px_-8px_rgba(22,63,56,0.5)]"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg>
            {t.msg}
          </div>
        ))}
      </div>
      <div
        className="pointer-events-none fixed inset-x-0 bottom-5 z-[121] flex flex-col items-center gap-2 px-4"
        role="alert"
        aria-live="assertive"
      >
        {toasts.filter((t) => t.tone === "error").map((t) => (
          <div
            key={t.id}
            className="pointer-events-auto flex items-center gap-2.5 rounded-[12px] border border-[#f0c9c2] bg-[#fdecea] px-4 py-2.5 text-[14px] font-semibold text-[#9a3025] shadow-[0_10px_30px_-8px_rgba(154,48,37,0.35)]"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 8v5M12 16.5v.5" /></svg>
            {t.msg}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
