import type { LucideIcon } from "lucide-react";

/**
 * Estrutura genérica das fichas clínicas (anamnese, avaliação):
 * etapas → seções → perguntas. O backend guarda as respostas por `id`.
 *
 * `col` = largura em colunas (de 12) no desktop; no celular tudo ocupa a linha.
 */
type Base = { id: string; rotulo: string; col?: Col; obrigatoria?: boolean; icone?: LucideIcon };
export type Col = 2 | 3 | 4 | 5 | 6 | 7 | 8 | 12;

export type Pergunta =
  | (Base & { tipo: "linha"; placeholder?: string; sufixo?: string; mascara?: "telefone"; email?: boolean })
  | (Base & { tipo: "texto"; placeholder?: string })
  | (Base & { tipo: "selecao"; opcoes: string[] })
  /** data (AAAA-MM-DD), sem datas futuras */
  | (Base & { tipo: "data" })
  /** Não / Sim + "Descreva..." (guardado em `${id}Detalhe`) */
  | (Base & { tipo: "simnao"; detalhe?: string })
  /** caixas de marcar; cada item é guardado como `id: true` */
  | (Base & { tipo: "checks"; itens: { id: string; rotulo: string; detalhe?: string }[]; colunas?: 1 | 2 });

export interface Secao {
  id: string;
  titulo: string;
  icone: LucideIcon;
  /** opcional: só aparece para pacientes menores de 18 anos */
  infantil?: boolean;
  /** mostra os dados do cadastro (nome, nascimento, idade, sexo) no topo */
  dadosCadastro?: boolean;
  perguntas: Pergunta[];
}

export interface Etapa {
  id: string;
  titulo: string;
  secoes: Secao[];
}

export type Respostas = Record<string, string | boolean>;

/** Etapas e seções visíveis para a idade do paciente (sem etapas vazias). */
export function etapasPara(etapas: Etapa[], menorDeIdade: boolean): Etapa[] {
  return etapas
    .map((e) => ({ ...e, secoes: e.secoes.filter((s) => menorDeIdade || !s.infantil) }))
    .filter((e) => e.secoes.length > 0);
}

/** Índice da etapa que contém a pergunta. */
export const etapaDaPergunta = (etapas: Etapa[], id: string) =>
  etapas.findIndex((e) => e.secoes.some((s) => s.perguntas.some((p) => p.id === id)));

/** Chaves de resposta de uma pergunta (checks têm uma por item). */
export const chaves = (p: Pergunta) => (p.tipo === "checks" ? p.itens.map((i) => i.id) : [p.id]);

export function respondida(p: Pergunta, r: Respostas) {
  return chaves(p).some((k) => {
    const v = r[k];
    return typeof v === "boolean" || (typeof v === "string" && v.trim() !== "");
  });
}

/** Remove detalhes órfãos (Sim/Não ≠ Sim, item de check desmarcado). */
export function limparRespostas(r: Respostas, perguntas: Pergunta[]): Respostas {
  const saida = { ...r };
  for (const p of perguntas) {
    if (p.tipo === "simnao" && saida[p.id] !== true) delete saida[`${p.id}Detalhe`];
    if (p.tipo === "checks")
      for (const i of p.itens) if (i.detalhe && saida[i.id] !== true) delete saida[`${i.id}Detalhe`];
  }
  return saida;
}

/** Hoje no fuso local, em AAAA-MM-DD. */
export function hojeIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
