"use client";

import {
  AlertTriangle,
  CalendarClock,
  Check,
  ChevronDown,
  CircleStop,
  ClipboardPen,
  Compass,
  History,
  Info,
  ListChecks,
  Loader2,
  Play,
  Plus,
  Save,
  Target,
  Trash2,
  X,
  type LucideIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import {
  api,
  type Avaliacao,
  type Meta,
  type Paciente,
  type Plano,
  type PlanoInput,
  type StatusMeta,
  type StatusPlano,
  type Evolucao,
  type ResultadoMeta,
} from "@/lib/api";
import { hojeIso } from "@/lib/ficha";
import { isoParaData } from "@/lib/format";
import { resultadoMeta } from "@/lib/metas";
import { dataHora, FichaCarregando, Moldura, type CabecalhoModulo } from "./FichaClinica";
import { Toast, type Aviso } from "./ui";

const CABECALHO: CabecalhoModulo = {
  modulo: "plano",
  titulo: "Plano Terapêutico",
  nome: "plano",
  icone: ListChecks,
};

const STATUS_META: { valor: StatusMeta; rotulo: string; cor: string; ponto: string }[] = [
  { valor: "nao_iniciada", rotulo: "Não iniciada", cor: "border-teal-300 text-teal-700", ponto: "border-2 border-teal-400 bg-white text-teal-700" },
  { valor: "em_andamento", rotulo: "Em andamento", cor: "border-teal-400 bg-teal-50 text-teal-800", ponto: "bg-teal-200 text-teal-800" },
  { valor: "atingida", rotulo: "Atingida", cor: "border-teal-600 bg-teal-600 text-white", ponto: "bg-teal-600 text-white" },
  { valor: "suspensa", rotulo: "Suspensa", cor: "border-blush-300 bg-blush-100 text-teal-800", ponto: "bg-blush-200 text-teal-700" },
];
const statusMeta = (s: StatusMeta) => STATUS_META.find((x) => x.valor === s)!;

const ROTULO_PLANO: Record<StatusPlano, string> = { rascunho: "Rascunho", ativo: "Ativo", encerrado: "Encerrado" };
const COR_PLANO: Record<StatusPlano, string> = {
  rascunho: "bg-blush-200 text-teal-700",
  ativo: "bg-teal-500 text-white",
  encerrado: "bg-teal-900/10 text-teal-800/70",
};

const FREQUENCIAS = ["1x por semana", "2x por semana", "3x por semana", "Quinzenal", "Mensal"];
const DURACOES = [30, 40, 45, 50, 60];
const MOTIVOS = ["Revisão do plano", "Alta", "Interrupção pelo paciente / família", "Encaminhamento", "Outro"];

const campoCls =
  "w-full min-w-0 rounded-lg border border-teal-300/90 bg-white px-3 text-sm text-teal-900 outline-none transition placeholder:text-teal-900/40 focus:border-teal-500 focus:ring-[3px] focus:ring-teal-500/15 disabled:cursor-default disabled:bg-teal-50/60 disabled:text-teal-900/70";
const rotuloCls = "mb-1 block text-[13.5px] font-bold text-teal-800";
const erroCls = "border-coral ring-[3px] ring-coral/15";

/* ------------------------------------------------------------------ dados */

type MetaForm = { id: string; descricao: string; prazo: string; status: StatusMeta };
type Form = {
  inicio: string;
  revisao: string;
  frequencia: string;
  duracaoSessao: string;
  diagnostico: string;
  objetivoGeral: string;
  metas: MetaForm[];
  estrategias: string;
  orientacoes: string;
  encaminhamentos: string;
  criteriosAlta: string;
};
type Erros = Partial<Record<"inicio" | "revisao" | "objetivoGeral" | "metas", string>> & { metasPrazo?: string[] };

const novoId = () => Math.random().toString(36).slice(2, 10);
const metaVazia = (): MetaForm => ({ id: novoId(), descricao: "", prazo: "", status: "nao_iniciada" });

function somarMeses(iso: string, meses: number) {
  const [a, m, d] = iso.split("-").map(Number);
  const dt = new Date(a, m - 1 + meses, d);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
}

const dePlano = (p: Plano): Form => ({
  inicio: p.inicio,
  revisao: p.revisao ?? "",
  frequencia: p.frequencia ?? "",
  duracaoSessao: p.duracaoSessao ? String(p.duracaoSessao) : "",
  diagnostico: p.diagnostico ?? "",
  objetivoGeral: p.objetivoGeral ?? "",
  metas: p.metas.map((m) => ({ ...m, prazo: m.prazo ?? "" })),
  estrategias: p.estrategias ?? "",
  orientacoes: p.orientacoes ?? "",
  encaminhamentos: p.encaminhamentos ?? "",
  criteriosAlta: p.criteriosAlta ?? "",
});

/**
 * Plano novo: parte do plano atual (o que ainda não foi atingido) ou,
 * se não houver, da última avaliação concluída.
 */
function planoNovo(lista: Plano[], avaliacao: Avaliacao | undefined): { form: Form; origem: string | null } {
  const hoje = hojeIso();
  const base = lista.find((p) => p.status === "ativo") ?? lista[0];
  if (base) {
    const metas = base.metas
      .filter((m) => m.status !== "atingida")
      // mantém o id: o histórico da meta na Evolução continua na nova versão do plano
      .map((m) => ({ ...m, prazo: m.prazo && m.prazo >= hoje ? m.prazo : "" }));
    return {
      form: {
        ...dePlano(base),
        inicio: hoje,
        revisao: somarMeses(hoje, 3),
        metas: metas.length ? metas : [metaVazia()],
      },
      origem: `Baseado no plano de ${isoParaData(base.inicio)}: metas atingidas não foram copiadas.`,
    };
  }
  const r = avaliacao?.respostas ?? {};
  const texto = (k: string) => (typeof r[k] === "string" ? (r[k] as string) : "");
  const meses = Number(texto("reavaliarEm").match(/\d+/)?.[0] ?? 3);
  return {
    form: {
      inicio: hoje,
      revisao: somarMeses(hoje, meses),
      frequencia: texto("frequencia"),
      duracaoSessao: "",
      diagnostico: texto("conclusao"),
      objetivoGeral: "",
      metas: [metaVazia()],
      estrategias: "",
      orientacoes: texto("orientacoes"),
      encaminhamentos: "",
      criteriosAlta: "",
    },
    origem: avaliacao ? `Diagnóstico e frequência trazidos da avaliação de ${isoParaData(avaliacao.data)}.` : null,
  };
}

const metasValidas = (f: Form) => f.metas.filter((m) => m.descricao.trim());

function paraApi(f: Form, status: StatusPlano, motivo?: string): PlanoInput {
  const t = (v: string) => v.trim() || null;
  return {
    status,
    inicio: f.inicio,
    revisao: f.revisao || null,
    frequencia: t(f.frequencia),
    duracaoSessao: f.duracaoSessao ? Number(f.duracaoSessao) : null,
    diagnostico: t(f.diagnostico),
    objetivoGeral: t(f.objetivoGeral),
    metas: metasValidas(f).map<Meta>((m) => ({ id: m.id, descricao: m.descricao.trim(), prazo: m.prazo || null, status: m.status })),
    estrategias: t(f.estrategias),
    orientacoes: t(f.orientacoes),
    encaminhamentos: t(f.encaminhamentos),
    criteriosAlta: t(f.criteriosAlta),
    motivoEncerramento: motivo ?? null,
  };
}

function validar(f: Form, status: StatusPlano): Erros {
  const e: Erros = {};
  if (!f.inicio) e.inicio = "Informe o início";
  else if (f.inicio > hojeIso()) e.inicio = "Data no futuro";
  if (f.revisao && f.inicio && f.revisao < f.inicio) e.revisao = "Antes do início";
  const prazos = f.metas.filter((m) => m.descricao.trim() && m.prazo && f.inicio && m.prazo < f.inicio).map((m) => m.id);
  if (prazos.length) e.metasPrazo = prazos;
  if (status === "ativo") {
    if (!f.objetivoGeral.trim()) e.objetivoGeral = "Informe o objetivo geral para ativar o plano";
    if (!metasValidas(f).length) e.metas = "Inclua ao menos uma meta para ativar o plano";
  }
  return e;
}

const maisRecentePrimeiro = (a: Plano, b: Plano) =>
  b.inicio.localeCompare(a.inicio) || b.criadoEm.localeCompare(a.criadoEm) || b.id.localeCompare(a.id);

type Selecao = { id: string | null; versao: number };

/* --------------------------------------------------------------- principal */

export function PlanoTerapeutico({ pacienteId }: { pacienteId: string }) {
  const router = useRouter();
  const [paciente, setPaciente] = useState<Paciente | null>(null);
  const [lista, setLista] = useState<Plano[]>([]);
  const [avaliacao, setAvaliacao] = useState<Avaliacao | undefined>();
  const [historico, setHistorico] = useState<Map<string, SessaoDaMeta[]>>(new Map());
  const [abertas, setAbertas] = useState<Set<string>>(new Set());
  const [sel, setSel] = useState<Selecao>({ id: null, versao: 0 });
  const [form, setForm] = useState<Form | null>(null);
  const [origem, setOrigem] = useState<string | null>(null);
  const [base, setBase] = useState("");
  const [erros, setErros] = useState<Erros>({});
  const [ocupado, setOcupado] = useState<"salvar" | "ativar" | "encerrar" | "excluir" | null>(null);
  const [encerrando, setEncerrando] = useState(false);
  const [motivo, setMotivo] = useState(MOTIVOS[0]);
  const [erroCarga, setErroCarga] = useState("");
  const [aviso, setAviso] = useState<Aviso>(null);
  const fecharAviso = useCallback(() => setAviso(null), []);

  /** abre um plano salvo (ou um novo, com `id` null) */
  const abrir = useCallback((id: string | null, planos: Plano[], av: Avaliacao | undefined) => {
    const p = planos.find((x) => x.id === id);
    const novo = p ? { form: dePlano(p), origem: null } : planoNovo(planos, av);
    setForm(novo.form);
    setOrigem(novo.origem);
    setBase(JSON.stringify(novo.form));
    setErros({});
    setEncerrando(false);
    setSel((s) => ({ id: p?.id ?? null, versao: s.versao + 1 }));
  }, []);

  useEffect(() => {
    Promise.all([
      api.obter(pacienteId),
      api.listarPlanos(pacienteId),
      api.listarAvaliacoes(pacienteId),
      api.listarEvolucoes(pacienteId),
    ])
      .then(([p, planos, avaliacoes, evolucoes]) => {
        setHistorico(historicoPorMeta(evolucoes));
        const av = avaliacoes.find((a) => a.concluida);
        setPaciente(p);
        setLista(planos);
        setAvaliacao(av);
        // abre o plano ativo; senão o mais recente; senão um novo
        abrir((planos.find((x) => x.status === "ativo") ?? planos[0])?.id ?? null, planos, av);
      })
      .catch((e: Error) => setErroCarga(e.message));
  }, [pacienteId, abrir]);

  const alterado = form !== null && JSON.stringify(form) !== base;
  useEffect(() => {
    if (!alterado) return;
    const h = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [alterado]);

  if (!paciente || !form) return <FichaCarregando config={CABECALHO} pacienteId={pacienteId} erro={erroCarga} />;

  const plano = lista.find((p) => p.id === sel.id) ?? null;
  const status: StatusPlano | null = plano?.status ?? null;
  const somenteLeitura = status === "encerrado";
  const podeSair = () => !alterado || confirm("Há alterações não salvas. Deseja sair mesmo assim?");

  const set = <K extends keyof Form>(campo: K) => (valor: Form[K]) => {
    setForm((f) => f && { ...f, [campo]: valor });
    if (campo in erros) setErros((e) => ({ ...e, [campo]: undefined }));
  };
  const setMeta = (id: string, mudanca: Partial<MetaForm>) => {
    setForm((f) => f && { ...f, metas: f.metas.map((m) => (m.id === id ? { ...m, ...mudanca } : m)) });
    setErros((e) => ({ ...e, metas: undefined, metasPrazo: e.metasPrazo?.filter((x) => x !== id) }));
  };

  async function gravar(novoStatus: StatusPlano, acao: "salvar" | "ativar" | "encerrar", motivoEnc?: string) {
    const e = validar(form!, novoStatus);
    setErros(e);
    const primeiro = e.objetivoGeral ?? e.metas ?? e.inicio ?? e.revisao ?? (e.metasPrazo?.length ? "O prazo de cada meta deve ser depois do início do plano" : undefined);
    if (primeiro) {
      setAviso({ tipo: "erro", texto: primeiro.includes("plano") || primeiro.includes("prazo") ? `${primeiro}.` : "Verifique os campos destacados." });
      return;
    }
    if (acao === "ativar" && lista.some((p) => p.status === "ativo" && p.id !== sel.id)) {
      if (!confirm("Este paciente já tem um plano ativo. Ativar este plano vai encerrar o anterior. Continuar?")) return;
    }
    setOcupado(acao);
    try {
      const salvo = await api.salvarPlano(pacienteId, sel.id, paraApi(form!, novoStatus, motivoEnc));
      // ativar pode ter encerrado outro plano: recarrega a lista
      const planos = acao === "ativar" ? await api.listarPlanos(pacienteId) : [...lista.filter((p) => p.id !== salvo.id), salvo].sort(maisRecentePrimeiro);
      setLista(planos);
      const f = dePlano(salvo);
      setForm(f);
      setBase(JSON.stringify(f));
      setOrigem(null);
      setEncerrando(false);
      setSel((s) => ({ ...s, id: salvo.id }));
      setAviso({
        tipo: "ok",
        texto: acao === "ativar" ? "Plano ativado!" : acao === "encerrar" ? "Plano encerrado." : novoStatus === "rascunho" ? "Rascunho salvo!" : "Plano atualizado!",
      });
    } catch (err) {
      setAviso({ tipo: "erro", texto: (err as Error).message });
    } finally {
      setOcupado(null);
    }
  }

  async function excluir() {
    if (!plano || plano.status !== "rascunho") return;
    if (!confirm(`Excluir o rascunho do plano de ${isoParaData(plano.inicio)}?`)) return;
    setOcupado("excluir");
    try {
      await api.removerPlano(pacienteId, plano.id);
      const resto = lista.filter((p) => p.id !== plano.id);
      setLista(resto);
      abrir((resto.find((x) => x.status === "ativo") ?? resto[0])?.id ?? null, resto, avaliacao);
      setAviso({ tipo: "ok", texto: "Rascunho excluído." });
    } catch (err) {
      setAviso({ tipo: "erro", texto: (err as Error).message });
    } finally {
      setOcupado(null);
    }
  }

  const validas = metasValidas(form);
  const atingidas = validas.filter((m) => m.status === "atingida").length;
  const hoje = hojeIso();
  const revisaoVencida = status === "ativo" && form.revisao && form.revisao < hoje;
  const temRascunho = lista.some((p) => p.status === "rascunho");

  return (
    <Moldura
      config={CABECALHO}
      pacienteId={pacienteId}
      subtitulo={plano ? `Plano de ${isoParaData(plano.inicio)} · ${paciente.nomeCompleto}` : `Novo plano · ${paciente.nomeCompleto}`}
      status={null}
      aoSair={(href) => podeSair() && router.push(href)}
    >
      {/* histórico de planos */}
      <section
        aria-label="Planos do paciente"
        className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-teal-200/80 bg-white/80 p-3 backdrop-blur-sm print:hidden"
      >
        <span className="flex items-center gap-2 pl-1 text-sm font-extrabold text-teal-800">
          <History className="size-5 text-teal-600" />
          Planos
        </span>
        <div className="order-last flex min-w-0 basis-full gap-2 overflow-x-auto pb-0.5 sm:order-none sm:flex-1 sm:basis-0">
          {sel.id === null && (
            <span aria-current="true" className="flex shrink-0 items-center gap-2 rounded-xl border-2 border-teal-600 bg-teal-50 px-3 py-1.5 text-sm font-bold text-teal-800">
              Novo
              <Etiqueta cor="bg-blush-200 text-teal-700">Não salvo</Etiqueta>
            </span>
          )}
          {lista.map((p) => {
            const ativo = p.id === sel.id;
            return (
              <button
                key={p.id}
                type="button"
                aria-current={ativo || undefined}
                onClick={() => !ativo && podeSair() && abrir(p.id, lista, avaliacao)}
                className={`flex shrink-0 items-center gap-2 rounded-xl border-2 px-3 py-1.5 text-sm font-bold transition ${
                  ativo ? "border-teal-600 bg-teal-50 text-teal-800" : "border-teal-200 bg-white text-teal-700 hover:border-teal-400"
                }`}
              >
                {isoParaData(p.inicio)}
                <Etiqueta cor={COR_PLANO[p.status]}>{ROTULO_PLANO[p.status]}</Etiqueta>
              </button>
            );
          })}
        </div>
        {sel.id !== null && !temRascunho && (
          <button
            type="button"
            onClick={() => podeSair() && abrir(null, lista, avaliacao)}
            className="ml-auto flex h-9 items-center gap-2 rounded-xl bg-teal-600 px-3 text-sm font-bold text-white transition hover:bg-teal-700"
          >
            <Plus className="size-4" strokeWidth={3} />
            {lista.some((p) => p.status === "ativo") ? "Revisar plano" : "Novo plano"}
          </button>
        )}
      </section>

      {/* avisos sobre o plano */}
      {origem && <Faixa icone={Info}>{origem}</Faixa>}
      {revisaoVencida && (
        <Faixa icone={AlertTriangle} alerta>
          A revisão deste plano estava prevista para {isoParaData(form.revisao)}. Use <strong>Revisar plano</strong> para criar a nova versão.
        </Faixa>
      )}
      {status === "encerrado" && plano && (
        <Faixa icone={CircleStop}>
          Plano encerrado em {dataHora(plano.encerradoEm!)}
          {plano.motivoEncerramento && <> · Motivo: <strong>{plano.motivoEncerramento}</strong></>}. Planos encerrados ficam só para consulta.
        </Faixa>
      )}

      <fieldset disabled={somenteLeitura || ocupado !== null} className="min-w-0 space-y-4 pb-4">
        {/* 1. dados */}
        <Cartao numero={1} titulo="Dados do Plano" icone={CalendarClock}>
          <div className="grid grid-cols-2 gap-x-4 gap-y-3 lg:grid-cols-4">
            <Data rotulo="Início" obrigatoria valor={form.inicio} mudar={set("inicio")} erro={erros.inicio} max={hoje} />
            <Data rotulo="Revisão prevista" valor={form.revisao} mudar={set("revisao")} erro={erros.revisao} min={form.inicio} />
            <Selecao rotulo="Frequência" valor={form.frequencia} mudar={set("frequencia")} opcoes={FREQUENCIAS} />
            <Selecao
              rotulo="Duração da sessão"
              valor={form.duracaoSessao}
              mudar={set("duracaoSessao")}
              opcoes={DURACOES.map(String)}
              sufixo=" min"
            />
          </div>
        </Cartao>

        {/* 2. diagnóstico e objetivo */}
        <Cartao numero={2} titulo="Diagnóstico e Objetivo Geral" icone={Compass}>
          <div className="grid gap-x-4 gap-y-3 lg:grid-cols-2">
            <AreaTexto
              rotulo="Diagnóstico / hipótese diagnóstica"
              placeholder="Diagnóstico fonoaudiológico que orienta o plano..."
              valor={form.diagnostico}
              mudar={set("diagnostico")}
              extra={
                avaliacao && typeof avaliacao.respostas.conclusao === "string" && form.diagnostico.trim() !== avaliacao.respostas.conclusao.trim() && !somenteLeitura ? (
                  <button
                    type="button"
                    onClick={() => set("diagnostico")(avaliacao.respostas.conclusao as string)}
                    className="text-xs font-bold text-teal-600 underline-offset-2 hover:underline"
                  >
                    Usar conclusão da avaliação de {isoParaData(avaliacao.data)}
                  </button>
                ) : null
              }
            />
            <AreaTexto
              rotulo="Objetivo geral"
              obrigatoria
              placeholder="Onde se quer chegar ao fim deste plano..."
              valor={form.objetivoGeral}
              mudar={set("objetivoGeral")}
              erro={erros.objetivoGeral}
            />
          </div>
        </Cartao>

        {/* 3. metas */}
        <Cartao
          numero={3}
          titulo="Metas Terapêuticas"
          icone={Target}
          extra={
            <span className="ml-auto rounded-full bg-white/90 px-3 py-1 text-xs font-extrabold text-teal-700">
              {atingidas} de {validas.length} atingida{validas.length === 1 ? "" : "s"}
            </span>
          }
        >
          <div className="mb-3 h-2 overflow-hidden rounded-full bg-teal-100" aria-hidden>
            <div
              className="h-full rounded-full bg-teal-500 transition-[width] duration-500"
              style={{ width: `${validas.length ? (atingidas / validas.length) * 100 : 0}%` }}
            />
          </div>

          <ol className="space-y-2" aria-label="Metas">
            {form.metas.map((m, i) => {
              const st = statusMeta(m.status);
              const vencida = status === "ativo" && m.prazo && m.prazo < hoje && m.status !== "atingida" && m.status !== "suspensa";
              const prazoErrado = erros.metasPrazo?.includes(m.id);
              return (
                <li
                  key={m.id}
                  aria-label={`Meta ${i + 1}`}
                  className="grid grid-cols-[2rem_minmax(0,1fr)] items-start gap-x-3 gap-y-2 rounded-xl border border-teal-200 bg-white/70 p-3 md:grid-cols-[2rem_minmax(0,1fr)_10rem_11rem_2rem]"
                >
                  <span className={`mt-1 grid size-7 place-items-center rounded-full text-xs font-extrabold ${st.ponto}`}>
                    {m.status === "atingida" ? <Check className="size-4" strokeWidth={3} /> : i + 1}
                  </span>
                  <textarea
                    aria-label={`Meta ${i + 1} — descrição`}
                    rows={1}
                    className={`${campoCls} min-h-9 resize-y py-1.5 ${m.status === "atingida" ? "text-teal-900/60 line-through decoration-teal-500/60" : ""}`}
                    placeholder="Ex.: Produzir /r/ em sílabas com 80% de acerto"
                    maxLength={500}
                    value={m.descricao}
                    onChange={(e) => setMeta(m.id, { descricao: e.target.value })}
                  />
                  <label className="col-start-2 block md:col-start-auto">
                    <span className="sr-only">Meta {i + 1} — prazo</span>
                    <input
                      type="date"
                      aria-label={`Meta ${i + 1} — prazo`}
                      title="Prazo"
                      className={`${campoCls} h-9 ${prazoErrado ? erroCls : vencida ? "border-coral/60 text-coral" : ""}`}
                      min={form.inicio}
                      value={m.prazo}
                      onChange={(e) => setMeta(m.id, { prazo: e.target.value })}
                    />
                    {vencida && <span className="mt-0.5 block text-[11px] font-bold text-coral">Prazo vencido</span>}
                    {prazoErrado && <span className="mt-0.5 block text-[11px] font-bold text-coral">Antes do início</span>}
                  </label>
                  <div className="relative col-start-2 md:col-start-auto">
                    <select
                      aria-label={`Meta ${i + 1} — situação`}
                      className={`${campoCls} h-9 cursor-pointer appearance-none border-2 pr-8 font-bold disabled:opacity-100 ${st.cor}`}
                      value={m.status}
                      onChange={(e) => setMeta(m.id, { status: e.target.value as StatusMeta })}
                    >
                      {STATUS_META.map((s) => (
                        <option key={s.valor} value={s.valor} className="bg-white font-normal text-teal-900">
                          {s.rotulo}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2.5 top-2.5 size-4 opacity-70" />
                  </div>
                  {!somenteLeitura && (
                    <button
                      type="button"
                      aria-label={`Remover meta ${i + 1}`}
                      title="Remover meta"
                      onClick={() => setForm((f) => f && { ...f, metas: f.metas.filter((x) => x.id !== m.id) })}
                      className="col-start-2 grid size-8 place-items-center justify-self-end rounded-full text-coral transition hover:bg-coral/10 md:col-start-auto"
                    >
                      <X className="size-4" />
                    </button>
                  )}
                  {status !== null && (
                    <HistoricoMeta
                      sessoes={historico.get(m.id) ?? []}
                      aberto={abertas.has(m.id)}
                      alternar={() =>
                        setAbertas((a) => {
                          const n = new Set(a);
                          if (n.has(m.id)) n.delete(m.id);
                          else n.add(m.id);
                          return n;
                        })
                      }
                    />
                  )}
                </li>
              );
            })}
          </ol>
          {erros.metas && <p className="mt-2 text-xs font-bold text-coral">{erros.metas}</p>}
          {!somenteLeitura && (
            <button
              type="button"
              onClick={() => {
                setForm((f) => f && { ...f, metas: [...f.metas, metaVazia()] });
                setErros((e) => ({ ...e, metas: undefined }));
              }}
              disabled={form.metas.length >= 30}
              className="mt-3 flex items-center gap-2 rounded-xl border-2 border-dashed border-teal-400 px-4 py-2 text-sm font-bold text-teal-700 transition hover:border-teal-600 hover:bg-teal-50 disabled:opacity-50"
            >
              <Plus className="size-4" strokeWidth={3} />
              Adicionar meta
            </button>
          )}
        </Cartao>

        {/* 4. estratégias */}
        <Cartao numero={4} titulo="Estratégias e Orientações" icone={ClipboardPen}>
          <div className="grid gap-x-4 gap-y-3 lg:grid-cols-2">
            <AreaTexto rotulo="Estratégias e abordagens" placeholder="Métodos, recursos e abordagens terapêuticas..." valor={form.estrategias} mudar={set("estrategias")} />
            <AreaTexto rotulo="Orientações à família / paciente" placeholder="O que fazer em casa, na escola..." valor={form.orientacoes} mudar={set("orientacoes")} />
            <AreaTexto rotulo="Encaminhamentos" placeholder="Outros profissionais / exames..." valor={form.encaminhamentos} mudar={set("encaminhamentos")} />
            <AreaTexto rotulo="Critérios de alta" placeholder="Quando o paciente poderá receber alta..." valor={form.criteriosAlta} mudar={set("criteriosAlta")} />
          </div>
        </Cartao>
      </fieldset>

      {/* barra de ações */}
      <div
        id="barra-plano"
        className="sticky bottom-3 z-30 mt-2 rounded-2xl border border-teal-200 bg-white/90 p-3 shadow-[0_10px_40px_-15px_rgba(36,92,82,.45)] backdrop-blur print:hidden"
      >
        {encerrando && (
          <div role="group" aria-label="Encerrar plano" className="mb-3 flex flex-wrap items-end gap-3 rounded-xl bg-blush-100/80 p-3">
            <label className="block min-w-56 flex-1">
              <span className={rotuloCls}>Motivo do encerramento</span>
              <div className="relative">
                <select className={`${campoCls} h-9 cursor-pointer appearance-none pr-8`} value={motivo} onChange={(e) => setMotivo(e.target.value)}>
                  {MOTIVOS.map((m) => (
                    <option key={m}>{m}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-2.5 size-4 text-teal-700" />
              </div>
            </label>
            <button type="button" onClick={() => setEncerrando(false)} className="h-9 rounded-xl px-4 text-sm font-bold text-teal-700 hover:bg-white/70">
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => gravar("encerrado", "encerrar", motivo)}
              disabled={ocupado !== null}
              className="flex h-9 items-center gap-2 rounded-xl bg-coral px-4 text-sm font-bold text-white transition hover:brightness-110 disabled:opacity-60"
            >
              {ocupado === "encerrar" ? <Loader2 className="size-4 animate-spin" /> : <CircleStop className="size-4" />}
              Confirmar encerramento
            </button>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <div className="basis-full px-1 sm:min-w-40 sm:flex-1 sm:basis-auto">
            <p className="flex items-center gap-2 text-sm font-extrabold text-teal-800">
              {status ? <Etiqueta cor={COR_PLANO[status]}>{ROTULO_PLANO[status]}</Etiqueta> : <Etiqueta cor="bg-blush-200 text-teal-700">Novo</Etiqueta>}
              {atingidas} de {validas.length} metas atingidas
            </p>
            <p className="mt-0.5 text-xs text-teal-700/60">
              {alterado
                ? "Alterações não salvas"
                : plano
                  ? `Salvo em ${dataHora(plano.atualizadoEm)}${plano.atualizadoPorNome ? ` por ${plano.atualizadoPorNome}` : ""}`
                  : "Ainda não salvo"}
            </p>
          </div>

          {status === "rascunho" && (
            <BotaoAcao onClick={excluir} carregando={ocupado === "excluir"} icone={Trash2} estilo="perigo" desabilitado={ocupado !== null}>
              Excluir rascunho
            </BotaoAcao>
          )}
          {(status === null || status === "rascunho") && (
            <>
              <BotaoAcao onClick={() => gravar("rascunho", "salvar")} carregando={ocupado === "salvar"} icone={Save} desabilitado={ocupado !== null || (!alterado && status !== null)}>
                Salvar rascunho
              </BotaoAcao>
              <BotaoAcao onClick={() => gravar("ativo", "ativar")} carregando={ocupado === "ativar"} icone={Play} estilo="principal" desabilitado={ocupado !== null}>
                Ativar plano
              </BotaoAcao>
            </>
          )}
          {status === "ativo" && (
            <>
              <BotaoAcao onClick={() => setEncerrando(true)} icone={CircleStop} estilo="perigo" desabilitado={ocupado !== null || encerrando}>
                Encerrar plano
              </BotaoAcao>
              <BotaoAcao onClick={() => gravar("ativo", "salvar")} carregando={ocupado === "salvar"} icone={Save} estilo="principal" desabilitado={ocupado !== null || !alterado}>
                Salvar alterações
              </BotaoAcao>
            </>
          )}
          {status === "encerrado" && (
            <BotaoAcao onClick={() => window.print()} icone={ListChecks}>
              Imprimir
            </BotaoAcao>
          )}
        </div>
      </div>

      <Toast aviso={aviso} fechar={fecharAviso} />
    </Moldura>
  );
}

/* ---------------------------------------------- histórico da meta (Evolução) */

type SessaoDaMeta = { id: string; data: string; resultado: ResultadoMeta | null; atividades: string | null };

/** Sessões em que cada meta foi trabalhada, da mais recente para a mais antiga. */
function historicoPorMeta(evolucoes: Evolucao[]) {
  const mapa = new Map<string, SessaoDaMeta[]>();
  for (const e of evolucoes)
    for (const m of e.metas ?? []) {
      const lista = mapa.get(m.id) ?? [];
      lista.push({ id: e.id, data: e.data, resultado: m.resultado, atividades: e.atividades });
      mapa.set(m.id, lista);
    }
  return mapa;
}

function HistoricoMeta({ sessoes, aberto, alternar }: { sessoes: SessaoDaMeta[]; aberto: boolean; alternar: () => void }) {
  if (!sessoes.length)
    return <p className="col-span-full pl-11 text-xs font-semibold text-teal-700/50">Ainda não trabalhada nas sessões de Evolução</p>;
  const ultima = sessoes[0];
  return (
    <div className="col-span-full pl-11">
      <button
        type="button"
        onClick={alternar}
        aria-expanded={aberto}
        className="flex flex-wrap items-center gap-x-2 gap-y-1 text-left text-xs font-bold text-teal-700 hover:text-teal-900"
      >
        <ChevronDown className={`size-3.5 transition ${aberto ? "rotate-180" : ""}`} />
        Trabalhada em {sessoes.length} {sessoes.length === 1 ? "sessão" : "sessões"} · última em {isoParaData(ultima.data)}
        {ultima.resultado && <Resultado valor={ultima.resultado} />}
      </button>
      {aberto && (
        <ol className="mt-2 space-y-1 border-l-2 border-teal-200 pl-3" aria-label="Sessões da meta">
          {sessoes.map((s) => (
            <li key={s.id} className="flex flex-wrap items-baseline gap-x-2 text-xs text-teal-900">
              <span className="font-bold">{isoParaData(s.data)}</span>
              {s.resultado ? <Resultado valor={s.resultado} /> : <span className="text-teal-700/50">sem resultado</span>}
              {s.atividades && <span className="min-w-0 truncate text-teal-800/70">— {s.atividades}</span>}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function Resultado({ valor }: { valor: ResultadoMeta }) {
  const r = resultadoMeta(valor);
  return <span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide ${r.cor}`}>{r.rotulo}</span>;
}

/* ------------------------------------------------------------- componentes */

function Etiqueta({ cor, children }: { cor: string; children: ReactNode }) {
  return <span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider ${cor}`}>{children}</span>;
}

function Faixa({ icone: Icone, alerta, children }: { icone: LucideIcon; alerta?: boolean; children: ReactNode }) {
  return (
    <p
      role={alerta ? "alert" : "status"}
      className={`mb-4 flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm font-semibold ${
        alerta ? "border-coral/40 bg-coral/10 text-coral" : "border-teal-200 bg-white/80 text-teal-800"
      }`}
    >
      <Icone className="mt-0.5 size-4 shrink-0" />
      <span>{children}</span>
    </p>
  );
}

function Cartao({
  numero,
  titulo,
  icone: Icone,
  extra,
  children,
}: {
  numero: number;
  titulo: string;
  icone: LucideIcon;
  extra?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section
      aria-labelledby={`plano-${numero}`}
      className="break-inside-avoid rounded-2xl border border-teal-200/80 bg-white/80 p-2 shadow-[0_12px_40px_-25px_rgba(36,92,82,.5)] backdrop-blur-sm"
    >
      <div className="flex items-center gap-3 rounded-xl bg-gradient-to-r from-teal-700 via-teal-500 to-teal-200 px-4 py-2 text-white">
        <Icone className="size-6" strokeWidth={1.8} />
        <h2 id={`plano-${numero}`} className="text-lg font-bold">
          {numero}. {titulo}
        </h2>
        {extra}
      </div>
      <div className="px-3 pb-3 pt-3">{children}</div>
    </section>
  );
}

function Data({
  rotulo,
  valor,
  mudar,
  erro,
  obrigatoria,
  min,
  max,
}: {
  rotulo: string;
  valor: string;
  mudar: (v: string) => void;
  erro?: string;
  obrigatoria?: boolean;
  min?: string;
  max?: string;
}) {
  return (
    <label className="block">
      <span className={rotuloCls}>
        {rotulo}
        {obrigatoria && <span className="text-coral"> *</span>}
      </span>
      <input
        type="date"
        className={`${campoCls} h-9 cursor-pointer ${erro ? erroCls : ""}`}
        aria-invalid={Boolean(erro) || undefined}
        min={min}
        max={max}
        value={valor}
        onChange={(e) => mudar(e.target.value)}
      />
      {erro && <span className="mt-1 block text-xs font-bold text-coral">{erro}</span>}
    </label>
  );
}

function Selecao({
  rotulo,
  valor,
  mudar,
  opcoes,
  sufixo = "",
}: {
  rotulo: string;
  valor: string;
  mudar: (v: string) => void;
  opcoes: string[];
  sufixo?: string;
}) {
  return (
    <label className="block">
      <span className={rotuloCls}>{rotulo}</span>
      <div className="relative">
        <select
          className={`${campoCls} h-9 cursor-pointer appearance-none pr-9 ${valor ? "" : "text-teal-900/45"}`}
          value={valor}
          onChange={(e) => mudar(e.target.value)}
        >
          <option value="">Selecione...</option>
          {valor && !opcoes.includes(valor) && <option value={valor}>{valor + sufixo}</option>}
          {opcoes.map((o) => (
            <option key={o} value={o} className="text-teal-900">
              {o + sufixo}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-2.5 size-4 text-teal-700" />
      </div>
    </label>
  );
}

function AreaTexto({
  rotulo,
  placeholder,
  valor,
  mudar,
  obrigatoria,
  erro,
  extra,
}: {
  rotulo: string;
  placeholder: string;
  valor: string;
  mudar: (v: string) => void;
  obrigatoria?: boolean;
  erro?: string;
  extra?: ReactNode;
}) {
  return (
    <div>
      <label className="block">
        <span className={rotuloCls}>
          {rotulo}
          {obrigatoria && <span className="text-coral"> *</span>}
        </span>
        <textarea
          className={`${campoCls} min-h-[5rem] resize-y py-2 ${erro ? erroCls : ""}`}
          placeholder={placeholder}
          maxLength={4000}
          aria-invalid={Boolean(erro) || undefined}
          value={valor}
          onChange={(e) => mudar(e.target.value)}
        />
      </label>
      {erro && <span className="mt-1 block text-xs font-bold text-coral">{erro}</span>}
      {extra && <div className="mt-1">{extra}</div>}
    </div>
  );
}

function BotaoAcao({
  onClick,
  carregando,
  icone: Icone,
  estilo = "secundario",
  desabilitado,
  children,
}: {
  onClick: () => void;
  carregando?: boolean;
  icone: LucideIcon;
  estilo?: "principal" | "secundario" | "perigo";
  desabilitado?: boolean;
  children: ReactNode;
}) {
  const estilos = {
    principal:
      "bg-gradient-to-r from-teal-700 to-teal-500 text-white shadow-[0_10px_24px_-10px_rgba(36,92,82,.8)] hover:brightness-110",
    secundario: "border-2 border-teal-600 text-teal-700 hover:bg-teal-50",
    perigo: "text-coral hover:bg-coral/10",
  };
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={desabilitado}
      className={`flex h-11 flex-1 items-center justify-center gap-2 rounded-xl px-4 font-bold transition active:scale-[.98] disabled:opacity-50 sm:flex-none ${estilos[estilo]}`}
    >
      {carregando ? <Loader2 className="size-5 animate-spin" /> : <Icone className="size-5" />}
      {children}
    </button>
  );
}
