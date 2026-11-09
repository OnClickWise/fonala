import type { Anamnese, Avaliacao, Evolucao, Paciente, Plano, StatusMeta, TipoDocumento } from "./api";
import { calcularIdade, isoParaData, mascaraCpf } from "./format";

/**
 * Modelos de documentos. O texto sai pré-preenchido com os dados do paciente
 * (cadastro, anamnese, avaliação, plano e evolução) e pode ser editado à vontade.
 */
export interface Contexto {
  paciente: Paciente;
  anamnese: Anamnese | null;
  /** última avaliação concluída */
  avaliacao?: Avaliacao;
  /** plano ativo (ou o mais recente) */
  plano?: Plano;
  evolucoes: Evolucao[];
}

export const MODELOS: { tipo: TipoDocumento; titulo: string; descricao: string }[] = [
  { tipo: "relatorio", titulo: "Relatório Fonoaudiológico", descricao: "Queixa, avaliação, plano e evolução" },
  { tipo: "declaracao", titulo: "Declaração de Comparecimento", descricao: "Para escola, trabalho ou convênio" },
  { tipo: "encaminhamento", titulo: "Encaminhamento", descricao: "Para outro profissional ou exame" },
  { tipo: "orientacoes", titulo: "Orientações à Família", descricao: "O que fazer em casa e na escola" },
  { tipo: "outro", titulo: "Documento em branco", descricao: "Texto livre" },
];

export const rotuloTipo = (t: TipoDocumento) => MODELOS.find((m) => m.tipo === t)!.titulo;

const SITUACAO_META: Record<StatusMeta, string> = {
  nao_iniciada: "não iniciada",
  em_andamento: "em andamento",
  atingida: "atingida",
  suspensa: "suspensa",
};

export const dataExtenso = (iso: string) => {
  const [a, m, d] = iso.split("-").map(Number);
  return new Date(a, m - 1, d).toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" });
};

/** "o paciente" / "a paciente" / "o(a) paciente" */
function artigo(p: Paciente) {
  return p.sexo === "F" ? { o: "a", do: "da", nascido: "nascida", acompanhado: "acompanhada" }
    : p.sexo === "M" ? { o: "o", do: "do", nascido: "nascido", acompanhado: "acompanhado" }
    : { o: "o(a)", do: "do(a)", nascido: "nascido(a)", acompanhado: "acompanhado(a)" };
}

const texto = (r: Record<string, string | boolean> | undefined, k: string) =>
  r && typeof r[k] === "string" ? (r[k] as string).trim() : "";

export function gerarModelo(tipo: TipoDocumento, ctx: Contexto, hoje: string): { titulo: string; conteudo: string } {
  const { paciente: p, anamnese, avaliacao, plano, evolucoes } = ctx;
  const a = artigo(p);
  const idade = calcularIdade(p.dataNascimento);
  const identificacao = `${p.nomeCompleto}, ${a.nascido} em ${isoParaData(p.dataNascimento)}${idade ? ` (${idade})` : ""}, CPF ${mascaraCpf(p.cpf)}`;
  const queixa = texto(anamnese?.respostas, "queixaPrincipal") || p.queixa || "";
  const conclusao = texto(avaliacao?.respostas, "conclusao");
  const diagnostico = plano?.diagnostico || conclusao;
  const titulo = rotuloTipo(tipo);

  switch (tipo) {
    case "declaracao":
      return {
        titulo,
        conteudo:
          `Declaro, para os devidos fins, que ${identificacao}, compareceu a atendimento fonoaudiológico ` +
          `na clínica FONALA – Audiologia e Fonoterapia no dia ${dataExtenso(hoje)}, no período das ____ às ____.` +
          (p.responsavelNome ? `\n\n${a.o[0].toUpperCase() + a.o.slice(1)} paciente esteve ${a.acompanhado} por ${p.responsavelNome}.` : ""),
      };

    case "encaminhamento":
      return {
        titulo,
        conteudo:
          `Encaminho ${a.o} paciente ${identificacao}, para avaliação com ______________________________.\n\n` +
          `Motivo do encaminhamento: ${diagnostico || queixa || "______________________________"}\n\n` +
          "Agradeço a atenção e coloco-me à disposição para a troca de informações sobre o caso.",
      };

    case "orientacoes": {
      const orient = plano?.orientacoes || texto(avaliacao?.respostas, "orientacoes");
      return {
        titulo,
        conteudo:
          `Orientações para a família ${a.do} paciente ${p.nomeCompleto}:\n\n` +
          (orient || "• \n• \n• ") +
          "\n\nEm caso de dúvidas, procure a fonoaudióloga responsável.",
      };
    }

    case "relatorio": {
      const partes: string[] = [`Paciente: ${identificacao}.`];
      partes.push(`1. QUEIXA\n${queixa || "Não registrada."}`);
      partes.push(
        `2. AVALIAÇÃO\n${
          avaliacao
            ? `Na avaliação realizada em ${isoParaData(avaliacao.data)}, concluiu-se: ${conclusao || "(sem conclusão registrada)"}`
            : "Não há avaliação concluída registrada."
        }`,
      );
      if (plano) {
        const metas = plano.metas.map((m) => `• ${m.descricao} — ${SITUACAO_META[m.status]}`).join("\n");
        partes.push(
          `3. PLANO TERAPÊUTICO\nObjetivo geral: ${plano.objetivoGeral || "—"}` +
            (plano.frequencia ? `\nFrequência: ${plano.frequencia}` : "") +
            (metas ? `\nMetas:\n${metas}` : ""),
        );
      } else partes.push("3. PLANO TERAPÊUTICO\nNão há plano terapêutico registrado.");

      const realizadas = evolucoes.filter((e) => e.presenca === "presente");
      if (evolucoes.length) {
        const datas = evolucoes.map((e) => e.data).sort();
        const freq = Math.round((realizadas.length / evolucoes.length) * 100);
        partes.push(
          `4. EVOLUÇÃO\nEntre ${isoParaData(datas[0])} e ${isoParaData(datas[datas.length - 1])} foram realizadas ` +
            `${realizadas.length} ${realizadas.length === 1 ? "sessão" : "sessões"} de terapia fonoaudiológica ` +
            `(frequência de ${freq}%). ______________________________`,
        );
      } else partes.push("4. EVOLUÇÃO\nAinda não há sessões registradas.");

      partes.push(
        `5. CONDUTA\n${plano?.frequencia ? `Manter terapia fonoaudiológica (${plano.frequencia}).` : "______________________________"}`,
      );
      return { titulo, conteudo: partes.join("\n\n") };
    }

    default:
      return { titulo: "", conteudo: "" };
  }
}
