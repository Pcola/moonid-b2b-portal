"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createCategory, renameCategory, moveCategory, reorderCategory, deleteCategory } from "./actions";

type Node = { id: string; name: string; count: number };
type Top = Node & { children: Node[] };

const inp = "rounded-lg border border-line bg-white px-2.5 py-1.5 text-[13.5px] text-ink outline-none transition focus:border-brand";
const iconBtn = "flex h-7 w-7 flex-none items-center justify-center rounded-lg border border-line text-muted-2 transition hover:text-ink disabled:opacity-40";

function ArrowUp() { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="m18 15-6-6-6 6" /></svg>; }
function ArrowDown() { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>; }
function Trash() { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" /></svg>; }

/** Jeden riadok kategórie (hlavnej alebo podkategórie) s premenovaním/poradím/mazaním. */
function CatRow({
  node, isChild, canUp, canDown, moveTargets, onAct,
}: {
  node: Node; isChild?: boolean; canUp: boolean; canDown: boolean;
  moveTargets?: { id: string; name: string }[];
  onAct: (fn: () => Promise<{ ok: boolean; error?: string }>) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(node.name);

  return (
    <div className={`flex items-center gap-2 py-1.5 ${isChild ? "" : "font-medium"}`}>
      {editing ? (
        <input autoFocus value={name} onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && name.trim()) { onAct(() => renameCategory(node.id, name.trim())); setEditing(false); } if (e.key === "Escape") { setName(node.name); setEditing(false); } }}
          className={`${inp} flex-1`} />
      ) : (
        <button type="button" onClick={() => { setName(node.name); setEditing(true); }} title="Premenovať" className="flex-1 truncate text-left text-[14px] text-ink hover:text-brand">
          {node.name}
        </button>
      )}
      <span className="flex-none rounded-full bg-cream px-2 py-0.5 text-[11.5px] tabular-nums text-muted-2" title="Počet produktov">{node.count}</span>

      {editing ? (
        <>
          <button type="button" onClick={() => { if (name.trim()) { onAct(() => renameCategory(node.id, name.trim())); setEditing(false); } }} className="rounded-lg bg-brand px-2.5 py-1.5 text-[12px] font-semibold text-white transition hover:bg-brand-2">Uložiť</button>
          <button type="button" onClick={() => { setName(node.name); setEditing(false); }} className="text-[12px] font-medium text-muted transition hover:text-ink">Zrušiť</button>
        </>
      ) : (
        <>
          <button type="button" onClick={() => onAct(() => reorderCategory(node.id, "up"))} disabled={!canUp} aria-label="Vyššie" className={iconBtn}><ArrowUp /></button>
          <button type="button" onClick={() => onAct(() => reorderCategory(node.id, "down"))} disabled={!canDown} aria-label="Nižšie" className={iconBtn}><ArrowDown /></button>
          {isChild && moveTargets && moveTargets.length > 0 && (
            <select value="" onChange={(e) => { if (e.target.value) onAct(() => moveCategory(node.id, e.target.value)); }} title="Presunúť pod inú kategóriu" className={`${inp} max-w-[130px]`}>
              <option value="">Presunúť…</option>
              {moveTargets.map((t) => <option key={t.id} value={t.id}>→ {t.name}</option>)}
            </select>
          )}
          <button type="button" onClick={() => { if (confirm(`Zmazať kategóriu „${node.name}"?`)) onAct(() => deleteCategory(node.id)); }} aria-label="Zmazať" className={`${iconBtn} hover:border-[#e0b0a8] hover:text-[#9a3025]`}><Trash /></button>
        </>
      )}
    </div>
  );
}

/** Pridávací riadok (hlavná kategória alebo podkategória pod daný parentId). */
function AddRow({ parentId, label, onAct }: { parentId: string | null; label: string; onAct: (fn: () => Promise<{ ok: boolean; error?: string }>) => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const submit = () => { if (name.trim()) { onAct(() => createCategory({ name: name.trim(), parentId })); setName(""); setOpen(false); } };
  if (!open) {
    return <button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-brand transition hover:text-brand-2">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>{label}
    </button>;
  }
  return (
    <div className="flex items-center gap-2">
      <input autoFocus value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") submit(); if (e.key === "Escape") { setName(""); setOpen(false); } }} placeholder={label} className={`${inp} flex-1`} />
      <button type="button" onClick={submit} disabled={!name.trim()} className="rounded-lg bg-brand px-3 py-1.5 text-[12.5px] font-semibold text-white transition hover:bg-brand-2 disabled:opacity-50">Pridať</button>
      <button type="button" onClick={() => { setName(""); setOpen(false); }} className="text-[12.5px] font-medium text-muted transition hover:text-ink">Zrušiť</button>
    </div>
  );
}

export function CategoryManager({ tree }: { tree: Top[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  function onAct(fn: () => Promise<{ ok: boolean; error?: string }>) {
    setErr(null);
    start(async () => {
      const r = await fn();
      if (r.ok) router.refresh(); else setErr(r.error ?? "Operácia zlyhala.");
    });
  }

  const topTargets = tree.map((t) => ({ id: t.id, name: t.name }));

  return (
    <div className={`flex flex-col gap-3 ${pending ? "opacity-60" : ""}`}>
      {err && <div className="rounded-lg border border-[#f0c9c2] bg-[#fdecea] px-3.5 py-2.5 text-[13px] text-[#9a3025]">{err}</div>}

      {tree.map((top, i) => (
        <section key={top.id} className="rounded-2xl border border-line bg-white p-4">
          <CatRow node={top} canUp={i > 0} canDown={i < tree.length - 1} onAct={onAct} />
          {(top.children.length > 0 || true) && (
            <div className="ml-3 mt-1.5 flex flex-col gap-0.5 border-l border-line pl-3">
              {top.children.map((ch, j) => (
                <CatRow key={ch.id} node={ch} isChild canUp={j > 0} canDown={j < top.children.length - 1}
                  moveTargets={topTargets.filter((t) => t.id !== top.id)} onAct={onAct} />
              ))}
              <div className="pt-1"><AddRow parentId={top.id} label="Podkategória" onAct={onAct} /></div>
            </div>
          )}
        </section>
      ))}

      {tree.length === 0 && <p className="rounded-2xl border border-dashed border-line bg-white p-6 text-center text-[13.5px] text-muted-2">Zatiaľ žiadne kategórie.</p>}

      <div className="rounded-2xl border border-dashed border-line bg-white p-4">
        <AddRow parentId={null} label="Hlavná kategória" onAct={onAct} />
      </div>
    </div>
  );
}
