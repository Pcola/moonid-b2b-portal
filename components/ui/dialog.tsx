"use client";

import { useCallback, useEffect, useId, useRef, type ReactNode } from "react";
import { focusFirst, trapTabKey } from "@/lib/focus-trap";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Modálne okno podľa WAI-ARIA vzoru „dialog (modal)".
 *
 *  Prečo vôbec: v projekte je desať volaní natívneho window.confirm() (mfa-setup.tsx:41,
 *  tier-editor.tsx:40, category-manager.tsx:57, order-actions.tsx:21,
 *  team-access-manager.tsx:100/252/260/289 …). Natívny confirm je neštýlovateľný, na
 *  mobiloch ho prehliadač vie potlačiť a text sa nedá formátovať — pritom niektoré
 *  z tých potvrdení sú nevratné operácie (storno objednávky, deaktivácia konta).
 *
 *  Prečo NIE <dialog showModal()>: natívny ::backdrop a top-layer sa v projekte bije
 *  s unlayered pravidlom :focus-visible (box-shadow ring) a s fixnou cookie lištou.
 *  Držíme sa rovnakého vzoru, aký už majú drawery v portal-shell.tsx:78-95 a
 *  catalog-browser.tsx:31-40 — len ho konečne máme na jednom mieste.
 *
 *  Pokrýva: role="dialog" + aria-modal, popis cez aria-labelledby/aria-describedby,
 *  pascu na Tab (lib/focus-trap.ts), Escape, návrat fokusu na otvárač, zámok rolovania. */

export function Dialog({
  open,
  onClose,
  title,
  description,
  footer,
  className,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  footer?: ReactNode;
  className?: string;
  children?: ReactNode;
}) {
  const uid = useId();
  const titleId = `dlg-${uid}-title`;
  const descId = description ? `dlg-${uid}-desc` : undefined;
  const panelRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    // otvárač si zapamätáme PRED presunom fokusu, aby sme sa naň mali kam vrátiť (SC 2.4.3)
    openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    focusFirst(panelRef.current);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
        return;
      }
      trapTabKey(e, panelRef.current);
    };
    document.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
      // rAF: DOM dialógu ešte existuje v momente cleanupu, fokus musí prísť až po odmountovaní
      const opener = openerRef.current;
      if (opener) requestAnimationFrame(() => opener.focus());
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-brand-deep/40 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        tabIndex={-1}
        className={cn("relative flex w-full max-w-[440px] flex-col gap-4 rounded-2xl border border-line bg-white p-6 shadow-[0_24px_60px_-18px_rgba(13,23,21,0.35)]", className)}
      >
        <h2 id={titleId} className="font-display text-[19px] font-semibold tracking-[-0.02em] text-ink">{title}</h2>
        {description && <div id={descId} className="text-[13.5px] leading-relaxed text-muted-3">{description}</div>}
        {children}
        {footer && <div className="flex flex-wrap items-center justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
}

/** Náhrada za window.confirm(). Predvolené popisky sú slovenské a zodpovedajú tónu portálu. */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Potvrdiť",
  cancelLabel = "Zrušiť",
  tone = "danger",
  busy,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "primary";
  busy?: boolean;
}) {
  const confirm = useCallback(() => {
    onConfirm();
    onClose();
  }, [onConfirm, onClose]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      footer={
        <>
          <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={busy}>{cancelLabel}</Button>
          <Button type="button" variant={tone} size="sm" onClick={confirm} disabled={busy}>{busy ? "Pracujem…" : confirmLabel}</Button>
        </>
      }
    />
  );
}
