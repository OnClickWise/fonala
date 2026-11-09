"use client";

import {
  CalendarDays,
  ChartNoAxesCombined,
  ClipboardCheck,
  ClipboardList,
  FileHeart,
  Headphones,
  Loader2,
  ScanSearch,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

const MODULOS: { titulo: string; icone: LucideIcon; rota?: string }[] = [
  { titulo: "Anamnese", icone: ClipboardList, rota: "anamnese" },
  { titulo: "Avaliação", icone: ScanSearch, rota: "avaliacao" },
  { titulo: "Anexos de Exames", icone: FileHeart, rota: "anexos" },
  { titulo: "Cronograma de Sessões", icone: CalendarDays, rota: "cronograma" },
  { titulo: "Plano Terapêutico", icone: ClipboardCheck, rota: "plano" },
  { titulo: "Relatório de Evolução", icone: ChartNoAxesCombined, rota: "evolucao" },
  { titulo: "Audiometria Fonala", icone: Headphones, rota: "audiometria" },
];

const cartao =
  "group relative flex w-full items-center gap-5 rounded-[2rem] border-2 border-teal-500/70 bg-white/70 px-5 py-4 text-left shadow-[0_8px_24px_-14px_rgba(36,92,82,.5)] backdrop-blur transition";
const ativo = `${cartao} hover:-translate-y-0.5 hover:bg-white hover:shadow-lg`;

/**
 * Atalhos dos módulos clínicos.
 * - com `pacienteId` (edição): abrem o módulo do paciente;
 * - com `aoAbrir` (novo cadastro): quem chama salva o paciente e navega.
 */
export function Modulos({
  pacienteId,
  aoAbrir,
}: {
  pacienteId?: string;
  aoAbrir?: (rota: string, titulo: string) => Promise<void>;
}) {
  const [abrindo, setAbrindo] = useState<string | null>(null);

  return (
    <nav aria-label="Módulos clínicos" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 print:hidden">
      {MODULOS.map(({ titulo, icone: Icone, rota }) => {
        const conteudo = (
          <>
            <span className="grid size-14 shrink-0 place-items-center rounded-full bg-gradient-to-br from-teal-100 to-teal-200 text-teal-700 shadow-inner transition group-hover:from-teal-500 group-hover:to-teal-600 group-hover:text-white">
              {abrindo === rota ? <Loader2 className="size-7 animate-spin" /> : <Icone className="size-7" strokeWidth={1.8} />}
            </span>
            <span className="text-lg font-bold leading-tight text-teal-800">{titulo}</span>
          </>
        );

        if (rota && pacienteId)
          return (
            <Link key={titulo} href={`/pacientes/${pacienteId}/${rota}`} title={`Abrir ${titulo}`} className={ativo}>
              {conteudo}
            </Link>
          );

        if (rota && aoAbrir)
          return (
            <button
              key={titulo}
              type="button"
              disabled={abrindo !== null}
              title={`Salvar o paciente e abrir ${titulo}`}
              onClick={async () => {
                setAbrindo(rota);
                try {
                  await aoAbrir(rota, titulo);
                } finally {
                  setAbrindo(null);
                }
              }}
              className={ativo}
            >
              {conteudo}
            </button>
          );

        return (
          <div key={titulo} aria-disabled title="Disponível em breve" className={`${cartao} cursor-default opacity-80`}>
            {conteudo}
            <span className="absolute right-4 top-2 rounded-full bg-blush-200 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-teal-700 opacity-0 transition group-hover:opacity-100">
              Em breve
            </span>
          </div>
        );
      })}
    </nav>
  );
}
