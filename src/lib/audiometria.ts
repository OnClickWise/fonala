/**
 * Audiometria tonal: frequências, escala e classificação sugerida.
 * - Grau: média tritonal (500, 1000 e 2000 Hz) da via aérea — Lloyd & Kaplan (1978).
 * - Tipo: relação via aérea × via óssea (gap aéreo-ósseo) — Silman & Silverman (1997).
 * A classificação é uma sugestão: a conclusão final é do profissional.
 */
export const FREQ_AEREA = [250, 500, 1000, 2000, 3000, 4000, 6000, 8000] as const;
export const FREQ_OSSEA = [500, 1000, 2000, 3000, 4000] as const;
export const DB_MIN = -10;
export const DB_MAX = 120;
export const VALORES_DB = Array.from({ length: (DB_MAX - DB_MIN) / 5 + 1 }, (_, i) => DB_MIN + i * 5);

export type Curva = Record<string, number>;
export type Orelha = { aerea: Curva; ossea: Curva };
export type Limiares = { od: Orelha; oe: Orelha };
export type LadoOrelha = "od" | "oe";
export type Via = "aerea" | "ossea";

export const rotuloFreq = (f: number) => (f >= 1000 ? `${f / 1000}k` : String(f));
export const limiaresVazios = (): Limiares => ({ od: { aerea: {}, ossea: {} }, oe: { aerea: {}, ossea: {} } });

const TRITONAL = [500, 1000, 2000];

function media(c: Curva) {
  const v = TRITONAL.map((f) => c[f]);
  if (v.some((x) => x === undefined)) return null;
  return Math.round((v.reduce((a, b) => a + b, 0) / 3) * 10) / 10;
}

export function grau(m: number) {
  if (m <= 25) return "normal";
  if (m <= 40) return "leve";
  if (m <= 55) return "moderado";
  if (m <= 70) return "moderadamente severo";
  if (m <= 90) return "severo";
  return "profundo";
}

export interface Classificacao {
  mediaAerea: number | null;
  mediaOssea: number | null;
  /** texto pronto para o laudo */
  descricao: string;
  normal: boolean;
}

export function classificar(o: Orelha): Classificacao {
  const ma = media(o.aerea);
  const mo = media(o.ossea);
  if (ma === null)
    return { mediaAerea: null, mediaOssea: mo, normal: false, descricao: "Incompleto: marque a via aérea em 500, 1000 e 2000 Hz" };
  const g = grau(ma);
  if (g === "normal")
    return { mediaAerea: ma, mediaOssea: mo, normal: true, descricao: "Audição dentro dos padrões de normalidade" };
  let tipo: string;
  if (mo === null) tipo = "de tipo a definir (sem via óssea)";
  else {
    const gap = ma - mo;
    tipo = mo <= 25 && gap >= 15 ? "condutiva" : mo > 25 && gap >= 15 ? "mista" : "neurossensorial";
  }
  return { mediaAerea: ma, mediaOssea: mo, normal: false, descricao: `Perda auditiva ${tipo} de grau ${g}` };
}

/** Texto sugerido para a conclusão, com as duas orelhas. */
export function conclusaoSugerida(l: Limiares) {
  const linha = (lado: LadoOrelha) => {
    const c = classificar(l[lado]);
    return `${lado === "od" ? "Orelha direita" : "Orelha esquerda"}: ${c.descricao}${c.mediaAerea !== null ? ` (média tritonal ${String(c.mediaAerea).replace(".", ",")} dB NA)` : ""}.`;
  };
  return `${linha("od")}\n${linha("oe")}`;
}
