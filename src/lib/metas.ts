import type { ResultadoMeta } from "./api";

/** Resultado de uma meta numa sessão (Evolução ↔ Plano Terapêutico). */
export const RESULTADOS_META: { valor: ResultadoMeta; rotulo: string; cor: string }[] = [
  { valor: "avancou", rotulo: "Avançou", cor: "bg-teal-600 text-white" },
  { valor: "estavel", rotulo: "Estável", cor: "bg-teal-100 text-teal-800" },
  { valor: "dificuldade", rotulo: "Com dificuldade", cor: "bg-coral/15 text-coral" },
];

export const resultadoMeta = (r: ResultadoMeta) => RESULTADOS_META.find((x) => x.valor === r)!;
