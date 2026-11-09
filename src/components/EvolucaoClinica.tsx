"use client";

import {
  CalendarCheck,
  CalendarX,
  ChartNoAxesCombined,
  Check,
  ChevronDown,
  Clock,
  Lightbulb,
  Loader2,
  Pencil,
  Percent,
  Plus,
  Search,
  Target,
  Trash2,
  X,
  type LucideIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  api,
  type Desempenho,
  type Evolucao,
  type EvolucaoInput,
  type Paciente,
  type Plano,
  type Presenca,
  type ResultadoMeta,
  type StatusMeta,
} from "@/lib/api";
import { hojeIso } from "@/lib/ficha";
import { isoParaData } from "@/lib/format";
import { RESULTADOS_META, resultadoMeta } from "@/lib/metas";
import { useSessao } from "@/lib/sessao";
import { dataHora, FichaCarregando, Moldura, type CabecalhoModulo } from "./FichaClinica";
import { Toast, type Aviso } from "./ui";

const CABECALHO: CabecalhoModulo = {
  modulo: "evolucao",
  titulo: "Evolução",
  nome: "evolução",
  icone: ChartNoAxesCombined,
};

const PRESENCAS: { valor: Presenca; rotulo: string }[] = [
  { valor: "presente", rotulo: "Presente" },
  { valor: "falta_justificada", rotulo: "Falta justificada" },
  { valor: "falta", rotulo: "Falta" },
];
const rotuloPresenca = (p: Presenca) => PRESENCAS.find((x) => x.valor === p)!.rotulo;

const DESEMPENHOS: { valor: Desempenho; rotulo: string; cor: string }[] = [
  { valor: "otimo", rotulo: "Ótimo", cor: "bg-teal-600 text-white" },
  { valor: "bom", rotulo: "Bom", cor: "bg-teal-100 text-teal-800" },
  { valor: "regular", rotulo: "Regular", cor: "bg-blush-200 text-teal-800" },
  { valor: "insatisfatorio", rotulo: "Insatisfatório", cor: "bg-coral/15 text-coral" },
];
const desempenhoDe = (d: Desempenho) => DESEMPENHOS.find((x) => x.valor === d)!;

const DURACOES = [30, 40, 45, 50, 60, 90];

const campoCls =
  "w-full min-w-0 rounded-lg border border-teal-300/90 bg-white px-3 text-sm text-teal-900 outline-none transition placeholder:text-teal-900/40 focus:border-teal-500 focus:ring-[3px] focus:ring-teal-500/15";
const rotuloCls = "mb-1 block text-[13.5px] font-bold text-teal-800";

type Form = {
  data: string;
  presenca: Presenca;
  duracao: string;
  objetivos: string;
  atividades: string;
  desempenho: Desempenho | "";
  observacoes: string;
  proximaSessao: string;
  /** plano de onde vêm as metas */
  planoId: string | null;
  /** metas trabalhadas: id → resultado ("" = sem resultado) */
  metas: Record<string, ResultadoMeta | "">;
};
type Erros = Partial<Record<"data" | "atividades", string>>;

const vazio = (planoAtivo?: Plano): Form => ({
  data: hojeIso(),
  presenca: "presente",
  duracao: "",
  objetivos: "",
  atividades: "",
  desempenho: "",
  observacoes: "",
  proximaSessao: "",
  planoId: planoAtivo?.id ?? null,
  metas: {},
});

const deEvolucao = (e: Evolucao, planoAtivo?: Plano): Form => ({
  data: e.data,
  presenca: e.presenca,
  duracao: e.duracao ? String(e.duracao) : "",
  objetivos: e.objetivos ?? "",
  atividades: e.atividades ?? "",
  desempenho: e.desempenho ?? "",
  observacoes: e.observacoes ?? "",
  proximaSessao: e.proximaSessao ?? "",
  planoId: e.planoId ?? planoAtivo?.id ?? null,
  metas: Object.fromEntries((e.metas ?? []).map((m) => [m.id, m.resultado ?? ""])),
});

const paraApi = (f: Form): EvolucaoInput => {
  const metas = Object.entries(f.metas).map(([id, r]) => ({ id, resultado: r || null }));
  return {
    data: f.data,
    presenca: f.presenca,
    duracao: f.duracao ? Number(f.duracao) : null,
    objetivos: f.objetivos.trim() || null,
    atividades: f.atividades.trim() || null,
    desempenho: f.desempenho || null,
    observacoes: f.observacoes.trim() || null,
    proximaSessao: f.proximaSessao.trim() || null,
    planoId: metas.length ? f.planoId : null,
    metas,
  };
};

/** Metas que podem ser marcadas: as do plano (menos suspensas) + as já marcadas na sessão. */
function opcoesDeMetas(f: Form, planos: Plano[], editando: Evolucao | null) {
  const plano = planos.find((p) => p.id === f.planoId);
  const opcoes: { id: string; descricao: string; status?: StatusMeta }[] = (plano?.metas ?? [])
    .filter((m) => m.status !== "suspensa" || m.id in f.metas)
    .map((m) => ({ id: m.id, descricao: m.descricao, status: m.status }));
  for (const m of editando?.metas ?? []) if (!opcoes.some((o) => o.id === m.id)) opcoes.push({ id: m.id, descricao: m.descricao });
  return { plano, opcoes };
}

function validar(f: Form): Erros {
  const e: Erros = {};
  if (!f.data) e.data = "Informe a data";
  else if (f.data > hojeIso()) e.data = "Data no futuro";
  if (f.presenca === "presente" && !f.atividades.trim()) e.atividades = "Descreva as atividades realizadas";
  return e;
}

const maisRecentePrimeiro = (a: Evolucao, b: Evolucao) =>
  b.data.localeCompare(a.data) || b.criadoEm.localeCompare(a.criadoEm) || b.id.localeCompare(a.id);

type Filtro = "todas" | "presencas" | "faltas";

/* --------------------------------------------------------------- principal */

export function EvolucaoClinica({ pacienteId }: { pacienteId: string }) {
  const router = useRouter();
  const { sessao } = useSessao();
  const [paciente, setPaciente] = useState<Paciente | null>(null);
  const [lista, setLista] = useState<Evolucao[]>([]);
  const [planos, setPlanos] = useState<Plano[]>([]);
  const [erroCarga, setErroCarga] = useState("");
  const [form, setForm] = useState<Form>(() => vazio());
  const [base, setBase] = useState(() => JSON.stringify(vazio()));
  const [filtroMeta, setFiltroMeta] = useState("");
  const [erros, setErros] = useState<Erros>({});
  const [editando, setEditando] = useState<Evolucao | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [excluindo, setExcluindo] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<Filtro>("todas");
  const [busca, setBusca] = useState("");
  const [aviso, setAviso] = useState<Aviso>(null);
  const fecharAviso = useCallback(() => setAviso(null), []);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    Promise.all([api.obter(pacienteId), api.listarEvolucoes(pacienteId), api.listarPlanos(pacienteId)])
      .then(([p, evolucoes, ps]) => {
        const v = vazio(ps.find((x) => x.status === "ativo"));
        // vindo do cronograma ("Registrar evolução"): já abre com a data da sessão
        const dataUrl = new URLSearchParams(window.location.search).get("data");
        if (dataUrl && /^\d{4}-\d{2}-\d{2}$/.test(dataUrl) && dataUrl <= hojeIso()) v.data = dataUrl;
        setPaciente(p);
        setLista(evolucoes);
        setPlanos(ps);
        setForm(v);
        setBase(JSON.stringify(v));
      })
      .catch((e: Error) => setErroCarga(e.message));
  }, [pacienteId]);

  const alterada = JSON.stringify(form) !== base;
  useEffect(() => {
    if (!alterada) return;
    const h = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [alterada]);

  // nº da sessão: ordem cronológica, contando só presenças
  const numeros = useMemo(() => {
    const m = new Map<string, number>();
    let n = 0;
    for (const e of [...lista].reverse()) if (e.presenca === "presente") m.set(e.id, ++n);
    return m;
  }, [lista]);

  if (!paciente) return <FichaCarregando config={CABECALHO} pacienteId={pacienteId} erro={erroCarga} />;

  const planoAtivo = planos.find((p) => p.status === "ativo");
  const podeSair = () => !alterada || confirm("Há alterações não salvas. Deseja sair mesmo assim?");

  const set =
    <K extends keyof Form>(campo: K) =>
    (valor: Form[K]) => {
      setForm((f) => ({ ...f, [campo]: valor }));
      if (campo in erros) setErros((e) => ({ ...e, [campo]: undefined }));
    };

  /** marca/desmarca uma meta (undefined) ou define o resultado dela */
  const marcarMeta = (id: string, valor: ResultadoMeta | "" | undefined) =>
    setForm((f) => {
      const metas = { ...f.metas };
      if (valor === undefined) delete metas[id];
      else metas[id] = valor;
      return { ...f, metas };
    });

  function recomecar() {
    const v = vazio(planoAtivo);
    setForm(v);
    setBase(JSON.stringify(v));
    setErros({});
    setEditando(null);
  }

  function editar(e: Evolucao) {
    if (!podeSair()) return;
    const f = deEvolucao(e, planoAtivo);
    setForm(f);
    setBase(JSON.stringify(f));
    setErros({});
    setEditando(e);
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function salvar(ev: React.FormEvent) {
    ev.preventDefault();
    const e = validar(form);
    setErros(e);
    if (Object.keys(e).length) {
      setAviso({ tipo: "erro", texto: "Verifique os campos destacados." });
      return;
    }
    setSalvando(true);
    try {
      const salva = await api.salvarEvolucao(pacienteId, editando?.id ?? null, paraApi(form));
      setLista((l) => [...l.filter((x) => x.id !== salva.id), salva].sort(maisRecentePrimeiro));
      setAviso({ tipo: "ok", texto: editando ? "Sessão atualizada!" : "Sessão registrada!" });
      recomecar();
    } catch (err) {
      setAviso({ tipo: "erro", texto: (err as Error).message });
    } finally {
      setSalvando(false);
    }
  }

  async function excluir(e: Evolucao) {
    if (!confirm(`Excluir o registro da sessão de ${isoParaData(e.data)}?`)) return;
    setExcluindo(e.id);
    try {
      await api.removerEvolucao(pacienteId, e.id);
      setLista((l) => l.filter((x) => x.id !== e.id));
      if (editando?.id === e.id) recomecar();
      setAviso({ tipo: "ok", texto: "Registro excluído." });
    } catch (err) {
      setAviso({ tipo: "erro", texto: (err as Error).message });
    } finally {
      setExcluindo(null);
    }
  }

  // resumo
  const realizadas = lista.filter((e) => e.presenca === "presente");
  const faltas = lista.length - realizadas.length;
  const justificadas = lista.filter((e) => e.presenca === "falta_justificada").length;
  const frequencia = lista.length ? Math.round((realizadas.length / lista.length) * 100) : null;

  // plano deixado na última sessão realizada (sugestão para os objetivos de hoje)
  const ultimoPlano = !editando && realizadas[0]?.proximaSessao ? realizadas[0] : undefined;

  // metas já trabalhadas (para o filtro): id → descrição mais recente
  const metasTrabalhadas = new Map<string, string>();
  for (const e of [...lista].reverse()) for (const m of e.metas ?? []) metasTrabalhadas.set(m.id, m.descricao);

  const termo = busca.trim().toLowerCase();
  const visiveis = lista.filter(
    (e) =>
      (filtro === "todas" || (filtro === "presencas") === (e.presenca === "presente")) &&
      (!filtroMeta || e.metas?.some((m) => m.id === filtroMeta)) &&
      (!termo ||
        [e.objetivos, e.atividades, e.observacoes, e.proximaSessao, e.criadoPorNome, ...(e.metas ?? []).map((m) => m.descricao)]
          .some((t) => t?.toLowerCase().includes(termo))),
  );

  const presente = form.presenca === "presente";
  const { plano: planoDasMetas, opcoes: opcoesMetas } = opcoesDeMetas(form, planos, editando);

  return (
    <Moldura
      config={CABECALHO}
      pacienteId={pacienteId}
      subtitulo={`Sessões de ${paciente.nomeCompleto}`}
      aoSair={(href) => podeSair() && router.push(href)}
    >
      {/* resumo */}
      <section aria-label="Resumo" className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Indicador icone={CalendarCheck} rotulo="Sessões realizadas" valor={String(realizadas.length)} />
        <Indicador
          icone={CalendarX}
          rotulo="Faltas"
          valor={String(faltas)}
          detalhe={faltas ? `${justificadas} justificada${justificadas === 1 ? "" : "s"}` : undefined}
        />
        <Indicador icone={Percent} rotulo="Frequência" valor={frequencia === null ? "--" : `${frequencia}%`} />
        <Indicador icone={Clock} rotulo="Última sessão" valor={realizadas[0] ? isoParaData(realizadas[0].data) : "--"} />
      </section>

      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-4 xl:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        {/* formulário */}
        <form
          ref={formRef}
          onSubmit={salvar}
          noValidate
          aria-label={editando ? "Editar sessão" : "Registrar sessão"}
          className="scroll-mt-4 rounded-2xl border border-teal-200/80 bg-white/80 p-2 shadow-[0_12px_40px_-25px_rgba(36,92,82,.5)] backdrop-blur-sm print:hidden xl:sticky xl:top-5"
        >
          <div className="flex items-center gap-3 rounded-xl bg-gradient-to-r from-teal-700 via-teal-500 to-teal-200 px-4 py-2 text-white">
            {editando ? <Pencil className="size-5" /> : <Plus className="size-5" strokeWidth={2.5} />}
            <h2 className="text-lg font-bold">
              {editando ? `Editando sessão de ${isoParaData(editando.data)}` : "Registrar sessão"}
            </h2>
            {editando && (
              <button
                type="button"
                onClick={() => podeSair() && recomecar()}
                className="ml-auto flex items-center gap-1 rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-teal-700 transition hover:bg-white"
              >
                <X className="size-3.5" />
                Cancelar
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-3 p-3">
            <label className="block">
              <span className={rotuloCls}>
                Data <span className="text-coral">*</span>
              </span>
              <input
                type="date"
                max={hojeIso()}
                className={`${campoCls} h-9 cursor-pointer ${erros.data ? "border-coral ring-[3px] ring-coral/15" : ""}`}
                aria-invalid={Boolean(erros.data) || undefined}
                value={form.data}
                onChange={(e) => set("data")(e.target.value)}
              />
              {erros.data && <span className="mt-1 block text-xs font-bold text-coral">{erros.data}</span>}
            </label>
            <label className={`block ${presente ? "" : "invisible"}`}>
              <span className={rotuloCls}>Duração</span>
              <div className="relative">
                <select
                  className={`${campoCls} h-9 cursor-pointer appearance-none pr-9 ${form.duracao ? "" : "text-teal-900/45"}`}
                  value={form.duracao}
                  onChange={(e) => set("duracao")(e.target.value)}
                  disabled={!presente}
                >
                  <option value="">Selecione...</option>
                  {form.duracao && !DURACOES.includes(Number(form.duracao)) && <option value={form.duracao}>{form.duracao} min</option>}
                  {DURACOES.map((d) => (
                    <option key={d} value={d} className="text-teal-900">
                      {d} min
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-2.5 size-4 text-teal-700" />
              </div>
            </label>

            <Escolha
              rotulo="Presença"
              obrigatoria
              opcoes={PRESENCAS}
              valor={form.presenca}
              escolher={(v) => v && set("presenca")(v)}
            />

            {presente && (
              <>
                {ultimoPlano && (
                  <div className="col-span-2 flex items-start gap-3 rounded-xl border border-blush-300 bg-blush-100/70 px-3 py-2.5">
                    <Lightbulb className="mt-0.5 size-5 shrink-0 text-coral" />
                    <div className="min-w-0 flex-1 text-sm text-teal-900">
                      <p className="font-bold text-teal-800">
                        Planejado na sessão de {isoParaData(ultimoPlano.data)}:
                      </p>
                      <p className="whitespace-pre-line break-words">{ultimoPlano.proximaSessao}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        set("objetivos")(
                          form.objetivos.trim() ? `${form.objetivos.trim()}\n${ultimoPlano.proximaSessao}` : ultimoPlano.proximaSessao!,
                        )
                      }
                      className="shrink-0 rounded-full bg-white px-3 py-1 text-xs font-bold text-teal-700 shadow-sm transition hover:bg-teal-50"
                    >
                      Usar nos objetivos
                    </button>
                  </div>
                )}
                <AreaTexto rotulo="Objetivos trabalhados" placeholder="O que se pretendia trabalhar nesta sessão..." valor={form.objetivos} mudar={set("objetivos")} />
                <MetasDaSessao
                  plano={planoDasMetas}
                  opcoes={opcoesMetas}
                  marcadas={form.metas}
                  marcar={marcarMeta}
                />
                <AreaTexto
                  rotulo="Atividades realizadas"
                  obrigatoria
                  placeholder="Estratégias, materiais e atividades aplicadas..."
                  valor={form.atividades}
                  mudar={set("atividades")}
                  erro={erros.atividades}
                />
                <Escolha
                  rotulo="Desempenho do paciente"
                  opcoes={DESEMPENHOS}
                  valor={form.desempenho || null}
                  escolher={(v) => set("desempenho")(v ?? "")}
                  desmarcavel
                />
              </>
            )}

            <AreaTexto
              rotulo={presente ? "Observações" : "Motivo / observações"}
              placeholder={presente ? "Comportamento, intercorrências, orientações à família..." : "Motivo da falta, aviso prévio, reposição..."}
              valor={form.observacoes}
              mudar={set("observacoes")}
            />
            {presente && (
              <AreaTexto
                rotulo="Planejamento para a próxima sessão"
                placeholder="O que trabalhar na próxima sessão..."
                valor={form.proximaSessao}
                mudar={set("proximaSessao")}
              />
            )}

            <button
              type="submit"
              disabled={salvando}
              className="col-span-2 mt-1 flex h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-teal-700 to-teal-500 font-bold text-white shadow-[0_10px_24px_-10px_rgba(36,92,82,.8)] transition hover:brightness-110 active:scale-[.98] disabled:opacity-60"
            >
              {salvando ? <Loader2 className="size-5 animate-spin" /> : <Check className="size-5" strokeWidth={3} />}
              {editando ? "Salvar alterações" : "Registrar sessão"}
            </button>
          </div>
        </form>

        {/* linha do tempo */}
        <section aria-label="Histórico de sessões" className="min-w-0">
          <div className="mb-3 flex flex-wrap items-center gap-2 print:hidden">
            <div className="relative min-w-48 flex-1">
              <Search className="pointer-events-none absolute left-3 top-2.5 size-4 text-teal-600" />
              <input
                type="search"
                className={`${campoCls} h-9 pl-9`}
                placeholder="Buscar nas sessões..."
                aria-label="Buscar nas sessões"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
              />
            </div>
            <div role="radiogroup" aria-label="Filtrar sessões" className="flex rounded-full border border-teal-300 bg-white/80 p-0.5">
              {(
                [
                  ["todas", "Todas"],
                  ["presencas", "Presenças"],
                  ["faltas", "Faltas"],
                ] as const
              ).map(([v, r]) => (
                <button
                  key={v}
                  type="button"
                  role="radio"
                  aria-checked={filtro === v}
                  onClick={() => setFiltro(v)}
                  className={`rounded-full px-3 py-1 text-sm font-bold transition ${
                    filtro === v ? "bg-teal-600 text-white" : "text-teal-700 hover:bg-teal-50"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
            {metasTrabalhadas.size > 0 && (
              <div className="relative w-full">
                <select
                  aria-label="Filtrar por meta"
                  className={`${campoCls} h-9 cursor-pointer appearance-none pr-9 ${filtroMeta ? "" : "text-teal-900/60"}`}
                  value={filtroMeta}
                  onChange={(e) => setFiltroMeta(e.target.value)}
                >
                  <option value="">Todas as metas do plano</option>
                  {[...metasTrabalhadas].map(([id, d]) => (
                    <option key={id} value={id} className="text-teal-900">
                      {d}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-2.5 size-4 text-teal-700" />
              </div>
            )}
          </div>

          {visiveis.length === 0 ? (
            <div className="grid place-items-center gap-2 rounded-2xl border border-dashed border-teal-300 bg-white/60 px-6 py-14 text-center">
              <ChartNoAxesCombined className="size-10 text-teal-400" strokeWidth={1.5} />
              <p className="font-bold text-teal-800">
                {lista.length ? "Nenhuma sessão encontrada" : "Nenhuma sessão registrada ainda"}
              </p>
              <p className="text-sm text-teal-700/70">
                {lista.length ? "Ajuste a busca ou o filtro." : "Use o formulário ao lado para registrar a primeira sessão."}
              </p>
            </div>
          ) : (
            <ol className="relative space-y-3 before:absolute before:bottom-4 before:left-[15px] before:top-4 before:w-0.5 before:bg-teal-300/70">
              {visiveis.map((e) => (
                <ItemSessao
                  key={e.id}
                  evolucao={e}
                  numero={numeros.get(e.id)}
                  meu={e.criadoPorId === sessao?.usuario.id}
                  emEdicao={editando?.id === e.id}
                  excluindo={excluindo === e.id}
                  editar={() => editar(e)}
                  excluir={() => excluir(e)}
                />
              ))}
            </ol>
          )}
        </section>
      </div>

      <Toast aviso={aviso} fechar={fecharAviso} />
    </Moldura>
  );
}

/* ------------------------------------------------------------- componentes */

function Indicador({ icone: Icone, rotulo, valor, detalhe }: { icone: LucideIcon; rotulo: string; valor: string; detalhe?: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-teal-200/80 bg-white/80 px-4 py-3 backdrop-blur-sm">
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-teal-100 to-teal-200 text-teal-700">
        <Icone className="size-5" />
      </span>
      <div className="min-w-0">
        <p className="truncate text-xs font-bold text-teal-700/70">{rotulo}</p>
        <p className="text-xl font-extrabold leading-tight text-teal-800">{valor}</p>
        {detalhe && <p className="truncate text-[11px] font-semibold text-teal-700/60">{detalhe}</p>}
      </div>
    </div>
  );
}

function AreaTexto({
  rotulo,
  placeholder,
  valor,
  mudar,
  obrigatoria,
  erro,
}: {
  rotulo: string;
  placeholder: string;
  valor: string;
  mudar: (v: string) => void;
  obrigatoria?: boolean;
  erro?: string;
}) {
  return (
    <label className="col-span-2 block">
      <span className={rotuloCls}>
        {rotulo}
        {obrigatoria && <span className="text-coral"> *</span>}
      </span>
      <textarea
        className={`${campoCls} min-h-[4.5rem] resize-y py-2 ${erro ? "border-coral ring-[3px] ring-coral/15" : ""}`}
        placeholder={placeholder}
        maxLength={4000}
        aria-invalid={Boolean(erro) || undefined}
        value={valor}
        onChange={(e) => mudar(e.target.value)}
      />
      {erro && <span className="mt-1 block text-xs font-bold text-coral">{erro}</span>}
    </label>
  );
}

function Escolha<T extends string>({
  rotulo,
  opcoes,
  valor,
  escolher,
  obrigatoria,
  desmarcavel,
}: {
  rotulo: string;
  opcoes: { valor: T; rotulo: string }[];
  valor: T | null;
  escolher: (v: T | null) => void;
  obrigatoria?: boolean;
  desmarcavel?: boolean;
}) {
  return (
    <div className="col-span-2">
      <span className={rotuloCls}>
        {rotulo}
        {obrigatoria && <span className="text-coral"> *</span>}
      </span>
      <div role="radiogroup" aria-label={rotulo} className="flex flex-wrap gap-2">
        {opcoes.map((o) => {
          const ativo = valor === o.valor;
          return (
            <button
              key={o.valor}
              type="button"
              role="radio"
              aria-checked={ativo}
              onClick={() => escolher(ativo && desmarcavel ? null : o.valor)}
              className={`rounded-full border-2 px-3.5 py-1.5 text-sm font-bold transition ${
                ativo ? "border-teal-600 bg-teal-600 text-white" : "border-teal-300 bg-white text-teal-700 hover:border-teal-500"
              }`}
            >
              {o.rotulo}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ItemSessao({
  evolucao: e,
  numero,
  meu,
  emEdicao,
  excluindo,
  editar,
  excluir,
}: {
  evolucao: Evolucao;
  numero?: number;
  meu: boolean;
  emEdicao: boolean;
  excluindo: boolean;
  editar: () => void;
  excluir: () => void;
}) {
  const presente = e.presenca === "presente";
  const editado = new Date(e.atualizadoEm).getTime() - new Date(e.criadoEm).getTime() > 1000;
  const blocos: [string, string | null][] = [
    ["Objetivos", e.objetivos],
    ["Atividades", e.atividades],
    [presente ? "Observações" : "Motivo / observações", e.observacoes],
    ["Próxima sessão", e.proximaSessao],
  ];

  return (
    <li className="relative break-inside-avoid pl-11">
      <span
        aria-hidden
        className={`absolute left-0 top-3 grid size-8 place-items-center rounded-full border-2 text-xs font-extrabold ${
          presente ? "border-teal-600 bg-teal-600 text-white" : "border-coral/60 bg-white text-coral"
        }`}
      >
        {presente ? numero : <X className="size-4" strokeWidth={3} />}
      </span>
      <article
        aria-label={`${presente ? `Sessão ${numero}` : rotuloPresenca(e.presenca)} — ${isoParaData(e.data)}`}
        className={`rounded-2xl border bg-white/85 p-4 shadow-[0_10px_30px_-22px_rgba(36,92,82,.6)] backdrop-blur-sm transition ${
          emEdicao ? "border-teal-500 ring-4 ring-teal-500/15" : "border-teal-200/80"
        }`}
      >
        <header className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <h3 className={`font-extrabold ${presente ? "text-teal-800" : "text-coral"}`}>
            {presente ? `Sessão ${numero}` : rotuloPresenca(e.presenca)}
          </h3>
          <span className="text-sm font-bold text-teal-700/80">{isoParaData(e.data)}</span>
          {e.duracao && <span className="text-sm text-teal-700/60">· {e.duracao} min</span>}
          {e.desempenho && (
            <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-extrabold uppercase tracking-wide ${desempenhoDe(e.desempenho).cor}`}>
              {desempenhoDe(e.desempenho).rotulo}
            </span>
          )}
          {meu && (
            <div className="ml-auto flex gap-1 print:hidden">
              <BotaoIcone rotulo="Editar sessão" onClick={editar}>
                <Pencil className="size-4" />
              </BotaoIcone>
              <BotaoIcone rotulo="Excluir sessão" onClick={excluir} perigo disabled={excluindo}>
                {excluindo ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
              </BotaoIcone>
            </div>
          )}
        </header>

        <dl className="mt-2 space-y-2">
          {blocos
            .filter(([, t]) => t)
            .map(([titulo, t]) => (
              <div key={titulo}>
                <dt className="text-xs font-extrabold uppercase tracking-wide text-teal-600">{titulo}</dt>
                <dd className="whitespace-pre-line break-words text-sm text-teal-900">{t}</dd>
              </div>
            ))}
          {e.metas?.length ? (
            <div>
              <dt className="text-xs font-extrabold uppercase tracking-wide text-teal-600">Metas do plano trabalhadas</dt>
              <dd>
                <ul className="mt-1 space-y-1" aria-label="Metas trabalhadas">
                  {e.metas.map((m) => (
                    <li key={m.id} className="flex flex-wrap items-center gap-2 text-sm text-teal-900">
                      <Target className="size-3.5 shrink-0 text-teal-500" />
                      <span className="min-w-0 break-words">{m.descricao}</span>
                      {m.resultado && (
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide ${resultadoMeta(m.resultado).cor}`}>
                          {resultadoMeta(m.resultado).rotulo}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </dd>
            </div>
          ) : null}
        </dl>

        <p className="mt-3 text-xs text-teal-700/60">
          Registrado por {e.criadoPorNome} em {dataHora(e.criadoEm)}
          {editado && ` · editado em ${dataHora(e.atualizadoEm)}`}
        </p>
      </article>
    </li>
  );
}

/** Metas do plano terapêutico trabalhadas na sessão, com resultado opcional. */
function MetasDaSessao({
  plano,
  opcoes,
  marcadas,
  marcar,
}: {
  plano: Plano | undefined;
  opcoes: { id: string; descricao: string; status?: StatusMeta }[];
  marcadas: Record<string, ResultadoMeta | "">;
  marcar: (id: string, valor: ResultadoMeta | "" | undefined) => void;
}) {
  if (!opcoes.length)
    return (
      <p className="col-span-2 flex items-center gap-2 rounded-xl bg-teal-50/70 px-3 py-2 text-xs font-semibold text-teal-700/80">
        <Target className="size-4 shrink-0" />
        {plano ? "O plano terapêutico ativo não tem metas." : "Sem plano terapêutico ativo: crie um em Plano Terapêutico para acompanhar as metas por sessão."}
      </p>
    );
  return (
    <fieldset className="col-span-2 rounded-xl border border-teal-200 bg-teal-50/40 p-3">
      <legend className="px-1 text-[13.5px] font-bold text-teal-800">
        Metas do plano trabalhadas
        {plano && <span className="font-semibold text-teal-700/60"> · plano de {isoParaData(plano.inicio)}</span>}
      </legend>
      <ul className="space-y-2" aria-label="Metas do plano">
        {opcoes.map((m) => {
          const marcada = m.id in marcadas;
          return (
            <li key={m.id} className="rounded-lg bg-white/80 px-3 py-2">
              <label className="flex cursor-pointer items-start gap-2 text-sm text-teal-900">
                <input
                  type="checkbox"
                  className="mt-0.5 size-[18px] shrink-0 cursor-pointer accent-teal-600"
                  checked={marcada}
                  onChange={(e) => marcar(m.id, e.target.checked ? "" : undefined)}
                />
                <span className="min-w-0 flex-1 break-words">
                  {m.descricao}
                  {m.status === "atingida" && (
                    <span className="ml-2 rounded-full bg-teal-600 px-1.5 py-0.5 text-[9px] font-extrabold uppercase text-white">Atingida</span>
                  )}
                </span>
              </label>
              {marcada && (
                <div role="radiogroup" aria-label={`Resultado — ${m.descricao}`} className="mt-2 flex flex-wrap gap-1.5 pl-7">
                  {RESULTADOS_META.map((r) => {
                    const ativo = marcadas[m.id] === r.valor;
                    return (
                      <button
                        key={r.valor}
                        type="button"
                        role="radio"
                        aria-checked={ativo}
                        onClick={() => marcar(m.id, ativo ? "" : r.valor)}
                        className={`rounded-full border px-2.5 py-0.5 text-xs font-bold transition ${
                          ativo ? `border-transparent ${r.cor}` : "border-teal-300 bg-white text-teal-700 hover:border-teal-500"
                        }`}
                      >
                        {r.rotulo}
                      </button>
                    );
                  })}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </fieldset>
  );
}

function BotaoIcone({
  rotulo,
  perigo,
  children,
  ...props
}: { rotulo: string; perigo?: boolean; children: ReactNode } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      aria-label={rotulo}
      title={rotulo}
      className={`grid size-8 place-items-center rounded-full transition disabled:opacity-50 ${
        perigo ? "text-coral hover:bg-coral/10" : "text-teal-600 hover:bg-teal-50"
      }`}
      {...props}
    >
      {children}
    </button>
  );
}
