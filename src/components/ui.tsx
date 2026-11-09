"use client";

import type { LucideIcon } from "lucide-react";
import { CheckCircle2, XCircle } from "lucide-react";
import { useEffect, type ReactNode } from "react";

export function Secao({
  icone: Icone,
  titulo,
  children,
}: {
  icone: LucideIcon;
  titulo: string;
  children: ReactNode;
}) {
  return (
    <section>
      <div className="flex items-center gap-3 rounded-t-3xl bg-gradient-to-r from-teal-600 to-teal-500 px-6 py-3 text-white">
        <Icone className="size-6 fill-white/90" strokeWidth={1.5} />
        <h2 className="text-lg font-bold tracking-wide">{titulo}</h2>
      </div>
      <div className="grid gap-x-6 gap-y-4 px-6 pb-6 pt-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}

export function Campo({
  rotulo,
  icone: Icone,
  erro,
  largo,
  children,
}: {
  rotulo: string;
  icone: LucideIcon;
  erro?: string;
  largo?: boolean;
  children: ReactNode;
}) {
  return (
    <label className={`block ${largo ? "sm:col-span-2" : ""}`}>
      <span className="mb-1.5 block text-[15px] font-extrabold text-teal-700">{rotulo}</span>
      <div
        className={`flex overflow-hidden rounded-2xl border bg-white/80 transition focus-within:ring-4 ${
          erro
            ? "border-coral/70 focus-within:ring-coral/15"
            : "border-teal-300 focus-within:border-teal-500 focus-within:ring-teal-500/15"
        }`}
      >
        <span className="grid w-12 shrink-0 place-items-start justify-center border-r border-teal-200 bg-teal-50/60 pt-3 text-teal-700">
          <Icone className="size-5" />
        </span>
        {children}
      </div>
      {erro?.trim() && <span className="mt-1 block text-xs font-semibold text-coral">{erro}</span>}
    </label>
  );
}

export const estiloInput =
  "w-full min-w-0 bg-transparent px-4 py-2.5 text-[15px] text-teal-800 outline-none placeholder:text-teal-800/40 disabled:bg-teal-50/70 disabled:text-teal-700";

export type Aviso = { tipo: "ok" | "erro"; texto: string } | null;

export function Toast({ aviso, fechar }: { aviso: Aviso; fechar: () => void }) {
  useEffect(() => {
    if (!aviso) return;
    const t = setTimeout(fechar, 4000);
    return () => clearTimeout(t);
  }, [aviso, fechar]);

  if (!aviso) return null;
  const ok = aviso.tipo === "ok";
  const Icone = ok ? CheckCircle2 : XCircle;
  return (
    <div
      role="status"
      className={`animate-surgir pointer-events-none fixed left-1/2 top-6 z-50 flex -translate-x-1/2 items-center gap-3 rounded-2xl px-5 py-3 text-sm font-bold text-white shadow-xl ${
        ok ? "bg-teal-600" : "bg-coral"
      }`}
    >
      <Icone className="size-5" />
      {aviso.texto}
    </div>
  );
}
