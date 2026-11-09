"use client";

import { useState, type MouseEvent } from "react";
import {
  DB_MAX,
  DB_MIN,
  FREQ_AEREA,
  FREQ_OSSEA,
  rotuloFreq,
  type LadoOrelha,
  type Limiares,
  type Via,
} from "@/lib/audiometria";

/** Cores e símbolos padrão: OD vermelho (O / <), OE azul (X / >). */
export const COR = { od: "#d9443f", oe: "#2563b0" } as const;

const L = 48; // margem esquerda
const T = 44; // margem superior
const LARG = 560;
const ALT = 390;
const W = L + LARG + 18;
const H = T + ALT + 14;

/** posição horizontal: oitavas igualmente espaçadas; 3k e 6k entre elas */
const IDX: Record<number, number> = { 250: 0, 500: 1, 1000: 2, 2000: 3, 3000: 3.5, 4000: 4, 6000: 4.5, 8000: 5 };
const x = (f: number) => L + (IDX[f] / 5) * LARG;
const y = (db: number) => T + ((db - DB_MIN) / (DB_MAX - DB_MIN)) * ALT;

function Simbolo({ lado, via, cx, cy, fantasma }: { lado: LadoOrelha; via: Via; cx: number; cy: number; fantasma?: boolean }) {
  const cor = COR[lado];
  const p = { stroke: cor, strokeWidth: 2.4, fill: "none", opacity: fantasma ? 0.45 : 1 };
  if (via === "aerea")
    return lado === "od" ? (
      <circle cx={cx} cy={cy} r={6.5} {...p} fill="#fff" />
    ) : (
      <path d={`M${cx - 6} ${cy - 6}L${cx + 6} ${cy + 6}M${cx + 6} ${cy - 6}L${cx - 6} ${cy + 6}`} {...p} />
    );
  // via óssea: "<" à esquerda (OD) e ">" à direita (OE) da frequência
  const dx = lado === "od" ? -11 : 11;
  const s = lado === "od" ? 1 : -1;
  return <path d={`M${cx + dx + 5 * s} ${cy - 7}L${cx + dx - 5 * s} ${cy}L${cx + dx + 5 * s} ${cy + 7}`} {...p} strokeLinejoin="round" />;
}

export function Audiograma({
  limiares,
  anteriores,
  lado,
  via,
  editavel,
  marcar,
}: {
  limiares: Limiares;
  /** exame anterior para comparação (só via aérea, esmaecida) */
  anteriores?: Limiares | null;
  lado: LadoOrelha;
  via: Via;
  editavel: boolean;
  /** define/limpa (null) o limiar da orelha e via selecionadas */
  marcar: (freq: number, db: number | null) => void;
}) {
  const [hover, setHover] = useState<{ f: number; db: number } | null>(null);
  const freqs = via === "aerea" ? FREQ_AEREA : FREQ_OSSEA;

  function posicao(e: MouseEvent<SVGRectElement>) {
    const svg = e.currentTarget.ownerSVGElement!;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const p = pt.matrixTransform(svg.getScreenCTM()!.inverse());
    const f = [...freqs].sort((a, b) => Math.abs(x(a) - p.x) - Math.abs(x(b) - p.x))[0];
    const db = Math.max(DB_MIN, Math.min(DB_MAX, Math.round((DB_MIN + ((p.y - T) / ALT) * (DB_MAX - DB_MIN)) / 5) * 5));
    return { f, db };
  }

  const linha = (l: Limiares, o: LadoOrelha) =>
    FREQ_AEREA.filter((f) => l[o].aerea[f] !== undefined)
      .map((f, i) => `${i ? "L" : "M"}${x(f)} ${y(l[o].aerea[f])}`)
      .join("");

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label="Audiograma: orelha direita em vermelho, orelha esquerda em azul"
      className="w-full select-none"
    >
      {/* faixa de normalidade */}
      <rect x={L} y={y(DB_MIN)} width={LARG} height={y(25) - y(DB_MIN)} fill="#2e8b7a" opacity={0.07} />
      {/* grade */}
      {Array.from({ length: (DB_MAX - DB_MIN) / 10 + 1 }, (_, i) => DB_MIN + i * 10).map((db) => (
        <g key={db}>
          <line x1={L} x2={L + LARG} y1={y(db)} y2={y(db)} stroke="#245c52" strokeOpacity={db === 0 ? 0.45 : 0.14} />
          <text x={L - 8} y={y(db) + 4} textAnchor="end" fontSize={11} fill="#245c52" opacity={0.7}>
            {db}
          </text>
        </g>
      ))}
      {FREQ_AEREA.map((f) => (
        <g key={f}>
          <line
            x1={x(f)}
            x2={x(f)}
            y1={T}
            y2={T + ALT}
            stroke="#245c52"
            strokeOpacity={0.16}
            strokeDasharray={f === 3000 || f === 6000 ? "4 4" : undefined}
          />
          <text x={x(f)} y={T - 12} textAnchor="middle" fontSize={11.5} fontWeight={700} fill="#245c52" opacity={0.75}>
            {rotuloFreq(f)}
          </text>
        </g>
      ))}
      <text x={L} y={12} textAnchor="start" fontSize={10} fill="#245c52" opacity={0.6}>
        Frequência (Hz)
      </text>
      <text x={12} y={T + ALT / 2} transform={`rotate(-90 12 ${T + ALT / 2})`} textAnchor="middle" fontSize={10} fill="#245c52" opacity={0.6}>
        Intensidade (dB NA)
      </text>

      {/* exame anterior (comparação) */}
      {anteriores &&
        (["od", "oe"] as const).map((o) => (
          <path key={`ant-${o}`} d={linha(anteriores, o)} fill="none" stroke={COR[o]} strokeWidth={2} strokeOpacity={0.25} strokeDasharray="2 5" />
        ))}

      {/* curvas da via aérea */}
      {(["od", "oe"] as const).map((o) => (
        <path key={o} d={linha(limiares, o)} fill="none" stroke={COR[o]} strokeWidth={2} strokeDasharray={o === "oe" ? "7 4" : undefined} />
      ))}

      {/* símbolos */}
      {(["od", "oe"] as const).flatMap((o) =>
        (["aerea", "ossea"] as const).flatMap((v) =>
          Object.entries(limiares[o][v]).map(([f, db]) => (
            <g key={`${o}-${v}-${f}`} data-ponto={`${o}-${v}-${f}`}>
              <title>{`${o === "od" ? "OD" : "OE"} · ${v === "aerea" ? "via aérea" : "via óssea"} · ${rotuloFreq(Number(f))} Hz: ${db} dB`}</title>
              <Simbolo lado={o} via={v} cx={x(Number(f))} cy={y(db)} />
            </g>
          )),
        ),
      )}

      {/* prévia do clique */}
      {editavel && hover && <Simbolo lado={lado} via={via} cx={x(hover.f)} cy={y(hover.db)} fantasma />}

      {editavel && (
        <rect
          data-testid="area-audiograma"
          x={L - 14}
          y={T - 8}
          width={LARG + 28}
          height={ALT + 16}
          fill="transparent"
          className="cursor-crosshair"
          onMouseMove={(e) => setHover(posicao(e))}
          onMouseLeave={() => setHover(null)}
          onClick={(e) => {
            const { f, db } = posicao(e);
            // clicar no mesmo ponto apaga o limiar
            marcar(f, limiares[lado][via][f] === db ? null : db);
          }}
        />
      )}
    </svg>
  );
}
