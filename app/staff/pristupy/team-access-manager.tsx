"use client";

import { useEffect, useRef, useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { LiveMessage } from "@/components/ui/live-region";
import {
  inviteInternalUser,
  resendInternalUserAccess,
  resetInternalUserMfa,
  setInternalUserActive,
  setInternalUserRole,
  type TeamActionResult,
} from "./actions";

type InternalRole = "STAFF" | "ADMIN";
type TeamUser = {
  id: string;
  email: string;
  name: string | null;
  role: InternalRole;
  active: boolean;
  mfaEnabled: boolean;
  companyId: string | null;
  authSyncPending: boolean;
  authDesiredActive: boolean | null;
  authManagedBan: boolean;
  authSyncedAt: string | null;
  lastLoginAt: string | null;
  createdAt: string;
};

const inputClass = "min-h-11 rounded-[10px] border border-field bg-white px-3 py-2 text-[14px] text-ink outline-none transition focus:border-brand disabled:bg-field/25 disabled:border-field/60 disabled:opacity-60";
const secondaryButton = "inline-flex min-h-11 items-center justify-center rounded-lg border border-line bg-white px-3 py-2 text-[12px] font-semibold text-muted transition hover:border-brand/30 hover:text-ink disabled:cursor-not-allowed disabled:opacity-45";

function ManualAccessLink({ url, warning }: { url: string; warning?: string }) {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopyState("copied");
      window.setTimeout(() => setCopyState("idle"), 2500);
    } catch {
      setCopyState("failed");
    }
  }
  return (
    <div className="rounded-xl border border-[#e7d7af] bg-[#fffaf0] p-3">
      <div className="text-[12.5px] font-semibold text-[#6d5520]">E-mail nebol doručený — citlivý jednorazový odkaz</div>
      <p className="mt-1 text-[12px] leading-relaxed text-[#786331]">{warning ?? "Odkaz odošlite používateľovi bezpečným kanálom a nikde ho trvalo neukladajte."}</p>
      <div className="mt-2 flex flex-col gap-2 sm:flex-row">
        <input readOnly value={url} aria-label="Jednorazový prístupový odkaz" className="min-h-11 min-w-0 flex-1 rounded-lg border border-[#a08946] bg-white px-2.5 py-1.5 font-mono text-[12px] text-ink outline-none" />
        <button type="button" onClick={copy} aria-label="Kopírovať jednorazový prístupový odkaz" className="min-h-11 rounded-lg bg-[#6d5520] px-3 py-2 text-[12px] font-semibold text-white">{copyState === "copied" ? "Skopírované" : "Kopírovať"}</button>
      </div>
      <div className="mt-1 min-h-[18px] text-[11.5px]" aria-live="polite">
        {copyState === "copied" && <span className="font-medium text-[#14633f]">Odkaz bol skopírovaný.</span>}
        {copyState === "failed" && <span className="font-medium text-[#9a3025]">Odkaz sa nepodarilo skopírovať. Označte ho a skopírujte ručne.</span>}
      </div>
    </div>
  );
}

export function InviteInternalUserForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<InternalRole>("STAFF");
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<TeamActionResult | null>(null);
  const inviteButtonRef = useRef<HTMLButtonElement>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const focusLauncherAfterCloseRef = useRef(false);

  useEffect(() => {
    let frame: number | undefined;
    if (open) {
      frame = window.requestAnimationFrame(() => emailInputRef.current?.focus());
    } else if (focusLauncherAfterCloseRef.current) {
      focusLauncherAfterCloseRef.current = false;
      frame = window.requestAnimationFrame(() => inviteButtonRef.current?.focus());
    }
    return () => {
      if (frame !== undefined) window.cancelAnimationFrame(frame);
    };
  }, [open]);

  function openForm() {
    setResult(null);
    setOpen(true);
  }

  function closeForm() {
    focusLauncherAfterCloseRef.current = true;
    setResult(null);
    setOpen(false);
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    if (role === "ADMIN" && !window.confirm("Udeľujete plný administrátorský prístup vrátane správy rolí a auditu. Pokračovať?")) return;
    setResult(null);
    startTransition(async () => {
      try {
        const response = await inviteInternalUser({ email, name, role });
        setResult(response);
        if (response.ok) {
          setEmail("");
          setName("");
          setRole("STAFF");
        }
      } catch {
        setResult({
          ok: false,
          error: "Spojenie sa prerušilo a výsledok pozvánky nie je potvrdený. Obnovte zoznam a pred opakovaním skontrolujte, či konto nevzniklo.",
        });
      } finally {
        router.refresh();
      }
    });
  }

  if (!open) {
    return (
      <div className="rounded-2xl border border-line bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-[16px] font-semibold text-ink">Pridať člena interného tímu</h2>
            <p className="mt-0.5 text-[13px] text-muted">Bez dočasného hesla—používateľ dostane jednorazový odkaz a potom nastaví MFA.</p>
          </div>
          <button ref={inviteButtonRef} type="button" onClick={openForm} className="min-h-11 rounded-[10px] bg-brand px-4 py-2.5 text-[13.5px] font-semibold text-white transition hover:bg-brand-2">Pozvať člena tímu</button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} aria-busy={pending} className="rounded-2xl border border-brand/25 bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-[16px] font-semibold text-ink">Nový interný prístup</h2>
          <p className="mt-0.5 text-[13px] text-muted">Pred odoslaním skontrolujte e-mail aj zvolenú rolu.</p>
        </div>
        <button type="button" onClick={closeForm} className="inline-flex min-h-11 items-center px-3 text-[13px] font-medium text-muted transition hover:text-ink">Zavrieť</button>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-[1.2fr_1fr_190px]">
        <label className="flex flex-col gap-1.5 text-[12.5px] font-medium text-muted-3">
          E-mail *
          <input ref={emailInputRef} type="email" required maxLength={160} autoComplete="off" value={email} onChange={(event) => setEmail(event.target.value)} aria-invalid={!!result && !result.ok} aria-describedby={result && !result.ok ? "invite-internal-error" : undefined} className={inputClass} placeholder="meno@moonid.sk" disabled={pending} />
        </label>
        <label className="flex flex-col gap-1.5 text-[12.5px] font-medium text-muted-3">
          Meno
          <input type="text" maxLength={120} autoComplete="off" value={name} onChange={(event) => setName(event.target.value)} className={inputClass} placeholder="Meno a priezvisko" disabled={pending} />
        </label>
        <label className="flex flex-col gap-1.5 text-[12.5px] font-medium text-muted-3">
          Rola *
          <select value={role} onChange={(event) => setRole(event.target.value as InternalRole)} className={inputClass} disabled={pending}>
            <option value="STAFF">Staff</option>
            <option value="ADMIN">Administrátor</option>
          </select>
        </label>
      </div>
      <div aria-live="polite">
        {role === "ADMIN" && (
          <div className="mt-3 rounded-lg border border-[#e7d7af] bg-[#fffaf0] px-3 py-2 text-[12.5px] text-[#6d5520]">
            Administrátor uvidí všetko čo staff a navyše môže meniť globálne nastavenia, roly a bezpečnostné prístupy.
          </div>
        )}
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <LiveMessage message={pending ? "Pozývam…" : result?.ok ? (result.emailSent ? "Pozvánka bola odoslaná e-mailom." : "Konto je vytvorené. E-mail neodišiel — nižšie je jednorazový odkaz na bezpečné odovzdanie.") : null} />
        <LiveMessage message={result && !result.ok ? result.error : null} tone="error" />
        <button type="submit" disabled={pending || !email.trim()} className="min-h-11 rounded-[10px] bg-brand px-4 py-2.5 text-[13.5px] font-semibold text-white transition hover:bg-brand-2 disabled:opacity-50">{pending ? "Pozývam…" : "Odoslať pozvánku"}</button>
        {result?.ok && result.emailSent && <span className="text-[13px] font-medium text-[#14633f]">Pozvánka bola odoslaná e-mailom.</span>}
        {result && !result.ok && <span id="invite-internal-error" className="text-[13px] font-medium text-[#9a3025]">{result.error}</span>}
      </div>
      {result?.inviteLink && <div className="mt-3"><ManualAccessLink url={result.inviteLink} warning={result.warning} /></div>}
    </form>
  );
}

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("sk-SK", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function TeamUserRow({ user, currentUserId }: { user: TeamUser; currentUserId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<TeamActionResult | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const self = user.id === currentUserId;
  const inconsistent = user.companyId !== null;
  const authSyncPending = user.authSyncPending;
  const baseDisabled = pending || inconsistent;
  const mutationDisabled = baseDisabled || authSyncPending;
  const status = authSyncPending
    ? "Auth synchronizácia čaká"
    : !user.active
      ? "Neaktívne"
      : user.lastLoginAt
        ? "Aktívne"
        : "Čaká na aktiváciu";
  const statusClass = authSyncPending
    ? "bg-[#fff5dc] text-[#805b0b]"
    : !user.active
      ? "bg-[#fdeceb] text-[#9a3025]"
      : user.lastLoginAt
        ? "bg-[#ecfdf3] text-[#14633f]"
        : "bg-[#fff5dc] text-[#805b0b]";
  const authStatusId = `auth-status-${user.id}`;
  const authDetail = authSyncPending
    ? user.authDesiredActive === true
      ? "Cieľ: aktivovať konto a odblokovať prihlásenie."
      : user.authDesiredActive === false
        ? "Cieľ: deaktivovať konto a zablokovať prihlásenie."
        : "Cieľ synchronizácie nie je evidovaný."
    : !user.active && user.authManagedBan
      ? `Prihlásenie blokuje Moonid${user.authSyncedAt ? ` · ${formatDate(user.authSyncedAt)}` : ""}.`
      : user.authSyncedAt
        ? `Auth zosúladené ${formatDate(user.authSyncedAt)}.`
        : null;

  function run(
    action: () => Promise<TeamActionResult>,
    success: string | ((response: TeamActionResult) => string),
  ) {
    setResult(null);
    setSuccessMessage(null);
    startTransition(async () => {
      try {
        const response = await action();
        setResult(response);
        if (response.ok) {
          setSuccessMessage(typeof success === "function" ? success(response) : success);
        }
      } catch {
        setResult({
          ok: false,
          error: "Spojenie sa prerušilo a výsledok operácie nie je potvrdený. Pred opakovaním skontrolujte obnovený stav konta.",
        });
      } finally {
        router.refresh();
      }
    });
  }

  function changeRole(nextRole: InternalRole) {
    if (nextRole === user.role) return;
    const question = nextRole === "ADMIN"
      ? `Udeliť účtu ${user.email} plný administrátorský prístup?`
      : `Odobrať účtu ${user.email} administrátorské oprávnenia?`;
    if (!window.confirm(question)) return;
    run(
      () => setInternalUserRole(user.id, nextRole),
      nextRole === "ADMIN" ? "Rola bola zmenená na administrátora." : "Rola bola zmenená na staff.",
    );
  }

  function changeActive() {
    if (user.active && !window.confirm(`Deaktivovať konto ${user.email}? Používateľ stratí prístup do interného portálu.`)) return;
    const nextActive = !user.active;
    run(
      () => setInternalUserActive(user.id, nextActive),
      nextActive
        ? "Konto bolo aktivované a prihlásenie je povolené."
        : "Konto bolo deaktivované a nové prihlásenia sú zablokované.",
    );
  }

  function retryAuthSync() {
    const desiredActive = user.authDesiredActive;
    if (desiredActive === null) return;
    run(
      () => setInternalUserActive(user.id, desiredActive),
      "Synchronizácia so Supabase Auth bola dokončená.",
    );
  }

  function resendAccess() {
    run(
      () => resendInternalUserAccess(user.id),
      (response) => response.emailSent
        ? "Nový prístupový odkaz bol odoslaný e-mailom."
        : "Jednorazový odkaz je pripravený na bezpečné odovzdanie.",
    );
  }

  function resetMfa() {
    if (!window.confirm(`Resetovať MFA účtu ${user.email}? Všetky jeho TOTP faktory a aktívne relácie budú zrušené; pri ďalšom vstupe nastaví MFA znova.`)) return;
    run(
      () => resetInternalUserMfa(user.id),
      "MFA bolo resetované; používateľ ho pri ďalšom vstupe nastaví znova.",
    );
  }

  return (
    <tr aria-busy={pending} className={`${authSyncPending ? "bg-[#fffaf0]" : user.active ? "" : "bg-cream/35"} border-b border-line last:border-0 align-top`}>
      <td className="px-4 py-3.5">
        <div className="max-w-[260px] truncate text-[13.5px] font-semibold text-ink">{user.name || user.email}{self && <span className="ml-1 font-normal text-brand-2">(vy)</span>}</div>
        <div className="max-w-[280px] truncate text-[12px] text-muted-2">{user.email}</div>
        {inconsistent && <div className="mt-1 text-[11.5px] font-medium text-[#9a3025]">Nekonzistentné konto: priradené k firme</div>}
      </td>
      <td className="px-4 py-3.5">
        <select value={user.role} onChange={(event) => changeRole(event.target.value as InternalRole)} disabled={mutationDisabled || self}
          aria-label={`Rola účtu ${user.email}`} title={self ? "Vlastnú admin rolu nemožno odobrať" : undefined}
          className="min-h-11 rounded-lg border border-field bg-white px-2 py-1.5 text-[12.5px] font-medium text-ink outline-none transition focus:border-brand disabled:cursor-not-allowed disabled:bg-cream disabled:text-muted-2">
          <option value="STAFF">Staff</option>
          <option value="ADMIN">Administrátor</option>
        </select>
      </td>
      <td className="px-4 py-3.5">
        <span className={`inline-flex rounded-full px-2 py-0.5 text-[11.5px] font-semibold ${user.mfaEnabled ? "bg-[#ecfdf3] text-[#14633f]" : "bg-[#fff5dc] text-[#805b0b]"}`}>
          {user.mfaEnabled ? "MFA aktívne" : "MFA čaká"}
        </span>
      </td>
      <td className="whitespace-nowrap px-4 py-3.5 text-[12.5px] text-muted">{formatDate(user.lastLoginAt)}</td>
      <td className="min-w-[200px] px-4 py-3.5">
        <span className={`inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-[11.5px] font-semibold ${statusClass}`}>{status}</span>
        {authDetail && <div id={authStatusId} className={`mt-1 max-w-[230px] text-[11.5px] leading-snug ${authSyncPending ? "font-medium text-[#805b0b]" : "text-muted-2"}`}>{authDetail}</div>}
      </td>
      <td className="min-w-[310px] px-4 py-3.5">
        <div className="flex flex-wrap gap-1.5">
          {authSyncPending ? (
            <button type="button" onClick={retryAuthSync} disabled={baseDisabled || user.authDesiredActive === null} aria-describedby={authStatusId} aria-label={`Dokončiť synchronizáciu Supabase Auth pre účet ${user.email}`} className={`${secondaryButton} border-[#dfce9e] text-[#6d5520]`}>{pending ? "Synchronizujem…" : "Dokončiť synchronizáciu"}</button>
          ) : (
            <button type="button" onClick={changeActive} disabled={baseDisabled || self} aria-label={`${user.active ? "Deaktivovať" : "Aktivovať"} konto ${user.email}`} title={self ? "Vlastné konto nemožno deaktivovať" : undefined} className={secondaryButton}>{pending ? "Pracujem…" : user.active ? "Deaktivovať" : "Aktivovať"}</button>
          )}
          {user.active && <button type="button" onClick={resendAccess} disabled={mutationDisabled} aria-label={`${user.lastLoginAt ? "Odoslať nový prístupový odkaz" : "Odoslať pozvánku znova"} pre účet ${user.email}`} className={secondaryButton}>{user.lastLoginAt ? "Nový prístupový odkaz" : "Poslať pozvánku znova"}</button>}
          {!self && <button type="button" onClick={resetMfa} disabled={mutationDisabled} aria-label={`Resetovať MFA účtu ${user.email}`} className={secondaryButton}>Resetovať MFA</button>}
          {self && <a href="/staff/bezpecnost" aria-label="Spravovať moje MFA" className={secondaryButton}>Moje MFA</a>}
        </div>
        <div className="mt-2 min-h-[18px]" aria-live="polite" aria-atomic="true">
          {pending && <span className="text-[11.5px] text-muted-2">Pracujem…</span>}
          {result?.ok && successMessage && <span className="text-[11.5px] font-medium text-[#14633f]">{successMessage}</span>}
          {result && !result.ok && <span className="text-[11.5px] font-medium text-[#9a3025]">{result.error}</span>}
        </div>
        {result?.inviteLink && <ManualAccessLink url={result.inviteLink} warning={result.warning} />}
      </td>
    </tr>
  );
}

export function TeamAccessManager({ users, currentUserId }: { users: TeamUser[]; currentUserId: string }) {
  if (users.length === 0) {
    return <div className="rounded-2xl border border-line bg-white p-10 text-center text-[14px] text-muted">Žiadne interné kontá pre zvolený filter.</div>;
  }
  return (
    <div className="overflow-x-auto rounded-2xl border border-line bg-white" role="region" tabIndex={0} aria-label="Tabuľka interných účtov; na menšej obrazovke ju možno posúvať vodorovne">
      <table className="w-full min-w-[1040px] text-left">
        <caption className="sr-only">Interné účty Moonid, ich roly, MFA, stav a dostupné administrátorské akcie</caption>
        <thead>
          <tr className="border-b border-line bg-cream/60 text-[11px] uppercase tracking-wide text-muted-2">
            <th scope="col" className="px-4 py-2.5 font-semibold">Konto</th>
            <th scope="col" className="px-4 py-2.5 font-semibold">Rola</th>
            <th scope="col" className="px-4 py-2.5 font-semibold">MFA</th>
            <th scope="col" className="px-4 py-2.5 font-semibold">Posledné prihlásenie</th>
            <th scope="col" className="px-4 py-2.5 font-semibold">Stav</th>
            <th scope="col" className="px-4 py-2.5 font-semibold">Akcie</th>
          </tr>
        </thead>
        <tbody>{users.map((user) => <TeamUserRow key={user.id} user={user} currentUserId={currentUserId} />)}</tbody>
      </table>
    </div>
  );
}
