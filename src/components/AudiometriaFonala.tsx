"use client";

import { Check, Ear, Headphones, History, Loader2, Plus, Sparkles, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { api, type Audiometria, type AudiometriaInput, type LogoAudiometria } from "@/lib/api";
import {
  classificar,
  conclusaoSugerida,
  FREQ_AEREA,
  FREQ_OSSEA,
  limiaresVazios,
  rotuloFreq,
  VALORES_DB,
  type LadoOrelha,
  type Limiares,
  type Via,
} from "@/lib/audiometria";
import { hojeIso } from "@/lib/ficha";
import { isoParaData } from "@/lib/format";
import { useSessao } from "@/lib/sessao";
import { Audiograma, COR } from "./Audiograma";
import { dataHora, FichaCarregando, Moldura, type CabecalhoModulo } from "./FichaClinica";
import { Toast, type Aviso } from "./ui";

const CABECALHO: CabecalhoModulo = { modulo: "audiometria", titulo: "Audiometria", nome: "audiometria", icone: Headphones };

const campoCls =
  "w-full min-w-0 rounded-lg border border-teal-300/90 bg-white px-2 text-sm text-teal-900 outline-none transition placeholder:text-teal-900/40 focus:border-teal-500 focus:ring-[3px] focus:ring-teal-500/15 disabled:bg-teal-50/60 disabled:text-teal-900/70";
const rotuloCls = "mb-1 block text-[13.5px] font-bold text-teal-800";
const NOME_LADO = { od: "Orelha direita (OD)", oe: "Orelha esquerda (OE)" } as const;

type Form = {
  data: string;
  limiares: Limiares;
  logo: { od: { srt: string; iprf: string }; oe: { srt: string; iprf: string } };
  observacoes: string;
  conclusao: string;
};

const vazio = (): Form => ({
  data: hojeIso(),
  limiares: limiaresVazios(),
  logo: { od: { srt: "", iprf: "" }, oe: { srt: "", iprf: "" } },
  observacoes: "",
  conclusao: "",
});
const txt = (v: number | null) => (v === null ? "" : String(v));
const deExame = (a: Audiometria): Form => ({
  data: a.data,
  limiares: a.limiares,
  logo: {
    od: { srt: txt(a.logo.od.srt), iprf: txt(a.logo.od.iprf) },
    oe: { srt: txt(a.logo.oe.srt), iprf: txt(a.logo.oe.iprf) },
  },
  observacoes: a.observacoes ?? "",
  conclusao: a.conclusao ?? "",
});
const num = (v: string) => (v.trim() === "" ? null : Number(v));
const paraApi = (f: Form): AudiometriaInput => ({
  data: f.data,
  limiares: f.limiares,
  logo: {
    od: { srt: num(f.logo.od.srt), iprf: num(f.logo.od.iprf) } as LogoAudiometria,
    oe: { srt: num(f.logo.oe.srt), iprf: num(f.logo.oe.iprf) } as LogoAudiometria,
  },
  observacoes: f.observacoes.trim() || null,
  conclusao: f.conclusao.trim() || null,
});

export function AudiometriaFonala({ pacienteId }: { pacienteId: string }) {
  const router = useRouter();
  const { sessao } = useSessao();
  const [nome, setNome] = useState<string | null>(null);
  const [lista, setLista] = useState<Audiometria[]>([]);
  const [selId, setSelId] = useState<string | null>(null);
  const [form, setForm] = useState<Form>(vazio);
  const [base, setBase] = useState(() => JSON.stringify(vazio()));
  const [lado, setLado] = useState<LadoOrelha>("od");
  const [via, setVia] = useState<Via>("aerea");
  const [comparar, setComparar] = useState(false);
  const [ocupado, setOcupado] = useState<"salvar" | "excluir" | null>(null);
  const [erroCarga, setErroCarga] = useState("");
  const [aviso, setAviso] = useState<Aviso>(null);
  const fecharAviso = useCallback(() => setAviso(null), []);

  useEffect(() => {
    Promise.all([api.obter(pacienteId), api.listarAudiometrias(pacienteId)])
      .then(([p, exames]) => {
        setNome(p.nomeCompleto);
        setLista(exames);
        if (exames[0]) {
          const f = deExame(exames[0]);
          setSelId(exames[0].id);
          setForm(f);
          setBase(JSON.stringify(f));
        }
      })
      .catch((e: Error) => setErroCarga(e.message));
  }, [pacienteId]);

  const alterado = JSON.stringify(form) !== base;
  useEffect(() => {
    if (!alterado) return;
    const h = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [alterado]);

  if (nome === null) return <FichaCarregando config={CABECALHO} pacienteId={pacienteId} erro={erroCarga} />;

  const salvo = lista.find((a) => a.id === selId);
  const editavel = !salvo || salvo.criadoPorId === sessao?.usuario.id;
  const idx = salvo ? lista.indexOf(salvo) : -1;
  const anterior = salvo ? lista[idx + 1] : lista[0];
  const podeSair = () => !alterado || confirm("Há alterações não salvas. Deseja sair mesmo assim?");

  const abrir = (a: Audiometria | null) => {
    const f = a ? deExame(a) : vazio();
    setSelId(a?.id ?? null);
    setForm(f);
    setBase(JSON.stringify(f));
  };

  const marcar = (o: LadoOrelha, v: Via, freq: number, db: number | null) =>
    setForm((f) => {
      const curva = { ...f.limiares[o][v] };
      if (db === null) delete curva[freq];
      else curva[freq] = db;
      return { ...f, limiares: { ...f.limiares, [o]: { ...f.limiares[o], [v]: curva } } };
    });
  const setLogo = (o: LadoOrelha, k: "srt" | "iprf", v: string) =>
    setForm((f) => ({ ...f, logo: { ...f.logo, [o]: { ...f.logo[o], [k]: v } } }));

  async function salvar() {
    if (!Object.keys(form.limiares.od.aerea).length && !Object.keys(form.limiares.oe.aerea).length) {
      setAviso({ tipo: "erro", texto: "Marque ao menos um limiar de via aérea no audiograma." });
      return;
    }
    const iprfs = [form.logo.od.iprf, form.logo.oe.iprf].map(num);
    if (iprfs.some((v) => v !== null && (!Number.isInteger(v) || v < 0 || v > 100))) {
      setAviso({ tipo: "erro", texto: "O IPRF deve ser um número de 0 a 100%." });
      return;
    }
    setOcupado("salvar");
    try {
      const a = await api.salvarAudiometria(pacienteId, selId, paraApi(form));
      setLista((l) => [...l.filter((x) => x.id !== a.id), a].sort((p, q) => q.data.localeCompare(p.data) || q.criadoEm.localeCompare(p.criadoEm)));
      abrir(a);
      setAviso({ tipo: "ok", texto: selId ? "Audiometria atualizada!" : "Audiometria registrada!" });
    } catch (e) {
      setAviso({ tipo: "erro", texto: (e as Error).message });
    } finally {
      setOcupado(null);
    }
  }

  async function excluir() {
    if (!salvo || !confirm(`Excluir a audiometria de ${isoParaData(salvo.data)}?`)) return;
    setOcupado("excluir");
    try {
      await api.removerAudiometria(pacienteId, salvo.id);
      const resto = lista.filter((x) => x.id !== salvo.id);
      setLista(resto);
      abrir(resto[0] ?? null);
      setAviso({ tipo: "ok", texto: "Audiometria excluída." });
    } catch (e) {
      setAviso({ tipo: "erro", texto: (e as Error).message });
    } finally {
      setOcupado(null);
    }
  }

  const sugestao = conclusaoSugerida(form.limiares);

  return (
    <Moldura
      config={CABECALHO}
      pacienteId={pacienteId}
      subtitulo={salvo ? `Audiometria de ${isoParaData(salvo.data)} · ${nome}` : `Nova audiometria · ${nome}`}
      aoSair={(href) => podeSair() && router.push(href)}
    >
      {/* histórico */}
      <section
        aria-label="Audiometrias do paciente"
        className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-teal-200/80 bg-white/80 p-3 backdrop-blur-sm print:hidden"
      >
        <span className="flex items-center gap-2 pl-1 text-sm font-extrabold text-teal-800">
          <History className="size-5 text-teal-600" />
          Exames
        </span>
        <div className="order-last flex min-w-0 basis-full gap-2 overflow-x-auto pb-0.5 sm:order-none sm:flex-1 sm:basis-0">
          {selId === null && (
            <span aria-current="true" className="shrink-0 rounded-xl border-2 border-teal-600 bg-teal-50 px-3 py-1.5 text-sm font-bold text-teal-800">
              Nova
            </span>
          )}
          {lista.map((a) => (
            <button
              key={a.id}
              type="button"
              aria-current={a.id === selId || undefined}
              onClick={() => a.id !== selId && podeSair() && abrir(a)}
              className={`shrink-0 rounded-xl border-2 px-3 py-1.5 text-sm font-bold transition ${
                a.id === selId ? "border-teal-600 bg-teal-50 text-teal-800" : "border-teal-200 bg-white text-teal-700 hover:border-teal-400"
              }`}
            >
              {isoParaData(a.data)}
            </button>
          ))}
        </div>
        {anterior && (
          <label className="flex cursor-pointer items-center gap-2 text-sm font-bold text-teal-700">
            <input type="checkbox" className="size-4 accent-teal-600" checked={comparar} onChange={(e) => setComparar(e.target.checked)} />
            Comparar com {isoParaData(anterior.data)}
          </label>
        )}
        {selId !== null && (
          <button
            type="button"
            onClick={() => podeSair() && abrir(null)}
            className="ml-auto flex h-9 items-center gap-2 rounded-xl bg-teal-600 px-3 text-sm font-bold text-white transition hover:bg-teal-700"
          >
            <Plus className="size-4" strokeWidth={3} />
            Nova audiometria
          </button>
        )}
      </section>

      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-4 xl:grid-cols-[minmax(0,7fr)_minmax(0,4fr)]">
        {/* audiograma */}
        <section aria-label="Audiograma" className="rounded-2xl border border-teal-200/80 bg-white/90 p-3 shadow-[0_12px_40px_-25px_rgba(36,92,82,.5)]">
          <div className="mb-2 flex flex-wrap items-center gap-2 print:hidden">
            {editavel && (
              <>
                <Alternar
                  rotulo="Orelha"
                  valor={lado}
                  opcoes={[
                    ["od", "OD · direita"],
                    ["oe", "OE · esquerda"],
                  ]}
                  mudar={setLado}
                  cor={(v) => COR[v]}
                />
                <Alternar
                  rotulo="Via"
                  valor={via}
                  opcoes={[
                    ["aerea", "Aérea"],
                    ["ossea", "Óssea"],
                  ]}
                  mudar={setVia}
                />
                <span className="text-xs font-semibold text-teal-700/60">Clique no gráfico para marcar; clique de novo para apagar.</span>
              </>
            )}
            <label className="ml-auto flex items-center gap-2 text-sm font-bold text-teal-800">
              Data
              <input
                type="date"
                max={hojeIso()}
                disabled={!editavel}
                aria-label="Data do exame"
                className={`${campoCls} h-9 w-auto`}
                value={form.data}
                onChange={(e) => e.target.value && setForm((f) => ({ ...f, data: e.target.value }))}
              />
            </label>
          </div>

          <Audiograma
            limiares={form.limiares}
            anteriores={comparar && anterior ? anterior.limiares : null}
            lado={lado}
            via={via}
            editavel={editavel}
            marcar={(f, db) => marcar(lado, via, f, db)}
          />

          <p className="mt-1 flex flex-wrap gap-x-4 gap-y-1 px-2 text-xs font-semibold text-teal-800/80">
            <span style={{ color: COR.od }}>○ OD aérea · &lt; OD óssea</span>
            <span style={{ color: COR.oe }}>✕ OE aérea · &gt; OE óssea</span>
            <span className="text-teal-700/60">Faixa sombreada: até 25 dB (normal)</span>
            {comparar && anterior && <span className="text-teal-700/60">Pontilhado claro: exame de {isoParaData(anterior.data)}</span>}
          </p>

          {/* tabela de limiares */}
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[560px] border-separate border-spacing-1 text-sm" aria-label="Limiares (dB NA)">
              <thead>
                <tr>
                  <th className="text-left text-xs font-bold text-teal-700/70">dB NA</th>
                  {FREQ_AEREA.map((f) => (
                    <th key={f} className="text-xs font-extrabold text-teal-800">
                      {rotuloFreq(f)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(["od", "oe"] as const).flatMap((o) =>
                  (["aerea", "ossea"] as const).map((v) => (
                    <tr key={`${o}-${v}`}>
                      <th scope="row" className="whitespace-nowrap pr-1 text-left text-xs font-extrabold" style={{ color: COR[o] }}>
                        {o.toUpperCase()} {v === "aerea" ? "aérea" : "óssea"}
                      </th>
                      {FREQ_AEREA.map((f) =>
                        v === "ossea" && !(FREQ_OSSEA as readonly number[]).includes(f) ? (
                          <td key={f} />
                        ) : (
                          <td key={f}>
                            <select
                              aria-label={`${o.toUpperCase()} ${v === "aerea" ? "aérea" : "óssea"} ${rotuloFreq(f)} Hz`}
                              disabled={!editavel}
                              className={`${campoCls} h-8 cursor-pointer appearance-none text-center`}
                              value={form.limiares[o][v][f] ?? ""}
                              onChange={(e) => marcar(o, v, f, e.target.value === "" ? null : Number(e.target.value))}
                            >
                              <option value="">—</option>
                              {VALORES_DB.map((db) => (
                                <option key={db} value={db}>
                                  {db}
                                </option>
                              ))}
                            </select>
                          </td>
                        ),
                      )}
                    </tr>
                  )),
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* classificação e laudo */}
        <div className="space-y-4">
          <section aria-label="Classificação" className="rounded-2xl border border-teal-200/80 bg-white/85 p-4">
            <h2 className="mb-3 flex items-center gap-2 font-extrabold text-teal-800">
              <Ear className="size-5 text-teal-600" />
              Classificação sugerida
            </h2>
            <div className="space-y-3">
              {(["od", "oe"] as const).map((o) => {
                const c = classificar(form.limiares[o]);
                return (
                  <div key={o} className="rounded-xl border-l-4 bg-teal-50/50 px-3 py-2" style={{ borderColor: COR[o] }}>
                    <p className="text-xs font-extrabold uppercase tracking-wide" style={{ color: COR[o] }}>
                      {NOME_LADO[o]}
                    </p>
                    <p data-classificacao={o} className={`font-bold ${c.normal ? "text-teal-700" : c.mediaAerea === null ? "text-teal-700/50" : "text-teal-900"}`}>
                      {c.descricao}
                    </p>
                    {c.mediaAerea !== null && (
                      <p className="text-xs text-teal-700/70">
                        Média tritonal VA: {String(c.mediaAerea).replace(".", ",")} dB
                        {c.mediaOssea !== null && ` · VO: ${String(c.mediaOssea).replace(".", ",")} dB`}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
            <p className="mt-2 text-[11px] text-teal-700/60">Grau: Lloyd & Kaplan (500, 1k e 2k Hz). Tipo: gap aéreo-ósseo. Confirme na conclusão.</p>
          </section>

          <section aria-label="Logoaudiometria" className="rounded-2xl border border-teal-200/80 bg-white/85 p-4">
            <h2 className="mb-3 font-extrabold text-teal-800">Logoaudiometria</h2>
            <div className="grid grid-cols-[auto_1fr_1fr] items-center gap-2 text-sm">
              <span />
              <span className="text-xs font-bold text-teal-700/70">SRT (dB NA)</span>
              <span className="text-xs font-bold text-teal-700/70">IPRF (%)</span>
              {(["od", "oe"] as const).map((o) => (
                <div key={o} className="contents">
                  <span className="text-xs font-extrabold" style={{ color: COR[o] }}>
                    {o.toUpperCase()}
                  </span>
                  <select
                    aria-label={`SRT ${o.toUpperCase()}`}
                    disabled={!editavel}
                    className={`${campoCls} h-9 cursor-pointer`}
                    value={form.logo[o].srt}
                    onChange={(e) => setLogo(o, "srt", e.target.value)}
                  >
                    <option value="">—</option>
                    {VALORES_DB.map((db) => (
                      <option key={db} value={db}>
                        {db}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    aria-label={`IPRF ${o.toUpperCase()}`}
                    disabled={!editavel}
                    className={`${campoCls} h-9`}
                    value={form.logo[o].iprf}
                    onChange={(e) => setLogo(o, "iprf", e.target.value)}
                  />
                </div>
              ))}
            </div>
          </section>

          <section aria-label="Laudo" className="space-y-3 rounded-2xl border border-teal-200/80 bg-white/85 p-4">
            <label className="block">
              <span className={rotuloCls}>Observações</span>
              <textarea
                disabled={!editavel}
                className={`${campoCls} min-h-16 resize-y px-3 py-2`}
                placeholder="Mascaramento, colaboração, meatoscopia..."
                value={form.observacoes}
                onChange={(e) => setForm((f) => ({ ...f, observacoes: e.target.value }))}
              />
            </label>
            <div>
              <label className="block">
                <span className={rotuloCls}>Conclusão</span>
                <textarea
                  disabled={!editavel}
                  className={`${campoCls} min-h-24 resize-y px-3 py-2`}
                  placeholder="Conclusão audiológica..."
                  value={form.conclusao}
                  onChange={(e) => setForm((f) => ({ ...f, conclusao: e.target.value }))}
                />
              </label>
              {editavel && form.conclusao.trim() !== sugestao && (
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, conclusao: sugestao }))}
                  className="mt-1 flex items-center gap-1 text-xs font-bold text-teal-600 hover:underline"
                >
                  <Sparkles className="size-3.5" />
                  Usar classificação sugerida
                </button>
              )}
            </div>
          </section>
        </div>
      </div>

      {/* barra */}
      <div className="sticky bottom-3 z-30 mt-4 flex flex-wrap items-center gap-3 rounded-2xl border border-teal-200 bg-white/90 p-3 shadow-[0_10px_40px_-15px_rgba(36,92,82,.45)] backdrop-blur print:hidden">
        <p className="basis-full px-1 text-xs text-teal-700/70 sm:flex-1 sm:basis-auto">
          {alterado
            ? "Alterações não salvas"
            : salvo
              ? `Registrada por ${salvo.criadoPorNome} em ${dataHora(salvo.criadoEm)}${editavel ? "" : " — somente leitura"}`
              : "Ainda não salva"}
        </p>
        {salvo && editavel && (
          <button
            type="button"
            onClick={excluir}
            disabled={ocupado !== null}
            className="flex h-11 items-center gap-2 rounded-xl px-4 font-bold text-coral transition hover:bg-coral/10 disabled:opacity-50"
          >
            {ocupado === "excluir" ? <Loader2 className="size-5 animate-spin" /> : <Trash2 className="size-5" />}
            Excluir
          </button>
        )}
        {editavel && (
          <button
            type="button"
            onClick={salvar}
            disabled={ocupado !== null || (!alterado && Boolean(salvo))}
            className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-teal-700 to-teal-500 px-6 font-bold text-white shadow-[0_10px_24px_-10px_rgba(36,92,82,.8)] transition hover:brightness-110 disabled:opacity-50 sm:flex-none"
          >
            {ocupado === "salvar" ? <Loader2 className="size-5 animate-spin" /> : <Check className="size-5" strokeWidth={3} />}
            {salvo ? "Salvar alterações" : "Salvar audiometria"}
          </button>
        )}
      </div>

      <Toast aviso={aviso} fechar={fecharAviso} />
    </Moldura>
  );
}

function Alternar<T extends string>({
  rotulo,
  valor,
  opcoes,
  mudar,
  cor,
}: {
  rotulo: string;
  valor: T;
  opcoes: [T, string][];
  mudar: (v: T) => void;
  cor?: (v: T) => string;
}) {
  return (
    <div role="radiogroup" aria-label={rotulo} className="flex rounded-full border border-teal-300 bg-white p-0.5">
      {opcoes.map(([v, r]) => (
        <button
          key={v}
          type="button"
          role="radio"
          aria-checked={valor === v}
          onClick={() => mudar(v)}
          style={valor === v && cor ? { backgroundColor: cor(v) } : undefined}
          className={`rounded-full px-3 py-1 text-sm font-bold transition ${valor === v ? "bg-teal-600 text-white" : "text-teal-700 hover:bg-teal-50"}`}
        >
          {r}
        </button>
      ))}
    </div>
  );
}
