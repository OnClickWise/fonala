"use client";

import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  ChartNoAxesCombined,
  Check,
  ChevronDown,
  ClipboardList,
  FileHeart,
  FileText,
  Headphones,
  ListChecks,
  Loader2,
  Pencil,
  Printer,
  Save,
  ScanSearch,
  Users,
  type LucideIcon,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { SEXOS, type Paciente, type RegistroFicha } from "@/lib/api";
import {
  etapaDaPergunta,
  etapasPara,
  hojeIso,
  limparRespostas,
  respondida,
  type Col,
  type Etapa,
  type Pergunta,
  type Respostas,
  type Secao,
} from "@/lib/ficha";
import { calcularIdade, idadeEmAnos, isoParaData, mascaraTelefone } from "@/lib/format";
import { MenuUsuario } from "./MenuUsuario";
import { Toast, type Aviso } from "./ui";

/* ------------------------------------------------------------ configuração */

export type Modulo =
  | "anamnese"
  | "avaliacao"
  | "audiometria"
  | "plano"
  | "evolucao"
  | "cronograma"
  | "anexos"
  | "documentos";

/** O que a moldura da página precisa saber do módulo. */
export type CabecalhoModulo = Pick<ConfigFicha, "modulo" | "titulo" | "nome" | "icone">;

export interface ConfigFicha {
  modulo: Modulo;
  /** "Anamnese", "Avaliação" */
  titulo: string;
  /** "anamnese", "avaliação" (botões e rótulos) */
  nome: string;
  icone: LucideIcon;
  etapas: Etapa[];
  /** campos exigidos para concluir (ou sempre, com `sempre`) */
  exigir: { id: string; mensagem: string; sempre?: boolean }[];
}

/* ------------------------------------------------------------------ estilos */

const campoCls =
  "h-9 w-full min-w-0 rounded-lg border border-teal-300/90 bg-white px-3 text-sm text-teal-900 outline-none transition placeholder:text-teal-900/40 focus:border-teal-500 focus:ring-[3px] focus:ring-teal-500/15 disabled:bg-teal-50/60 disabled:text-teal-900/50";
const rotuloCls = "mb-1 block text-[13.5px] font-bold text-teal-800";
const erroCls = "border-coral ring-[3px] ring-coral/15";

const COL: Record<Col, string> = {
  2: "sm:col-span-6 lg:col-span-2",
  3: "sm:col-span-6 lg:col-span-3",
  4: "sm:col-span-6 lg:col-span-4",
  5: "sm:col-span-6 lg:col-span-5",
  6: "sm:col-span-6",
  7: "lg:col-span-7",
  8: "lg:col-span-8",
  12: "",
};
const colunas = (c: Col = 12) => `col-span-12 ${COL[c]}`;

export const dataHora = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });

const preenchido = (r: Respostas, id: string) => typeof r[id] === "string" && (r[id] as string).trim() !== "";

/* --------------------------------------------------------------- principal */

/**
 * Ficha clínica genérica: cabeçalho com stepper, seções numeradas, barra de
 * ações fixa (rascunho / concluir), aviso de alterações não salvas e impressão.
 */
export function FichaClinica({
  config,
  paciente,
  registro: registroInicial,
  inicial,
  salvar: salvarNoServidor,
  aoSalvar,
  topo,
  subtitulo,
}: {
  config: ConfigFicha;
  paciente: Paciente;
  /** registro já salvo (null = ainda não salvo) */
  registro: RegistroFicha | null;
  /** respostas iniciais */
  inicial: Respostas;
  salvar: (respostas: Respostas, concluir: boolean) => Promise<RegistroFicha>;
  aoSalvar?: (r: RegistroFicha) => void;
  /** conteúdo acima das seções; recebe `podeSair()` para confirmar descarte de alterações */
  topo?: (podeSair: () => boolean) => ReactNode;
  subtitulo: string;
}) {
  const router = useRouter();
  const [salva, setSalva] = useState<RegistroFicha | null>(registroInicial);
  const [respostas, setRespostas] = useState<Respostas>(inicial);
  const [base, setBase] = useState(() => JSON.stringify(inicial));
  const [erros, setErros] = useState<Record<string, string>>({});
  const [salvando, setSalvando] = useState<"rascunho" | "concluir" | null>(null);
  const [atual, setAtual] = useState(0);
  const [aviso, setAviso] = useState<Aviso>(null);
  const fecharAviso = useCallback(() => setAviso(null), []);

  const etapas = useMemo(
    () => etapasPara(config.etapas, idadeEmAnos(paciente.dataNascimento) < 18),
    [config.etapas, paciente],
  );
  const perguntas = useMemo(() => etapas.flatMap((e) => e.secoes.flatMap((s) => s.perguntas)), [etapas]);
  const limpas = limparRespostas(respostas, perguntas);
  const alterada = JSON.stringify(limpas) !== base;
  const feitas = perguntas.filter((p) => respondida(p, respostas)).length;

  // etapa atual acompanha a rolagem
  const refs = useRef<(HTMLDivElement | null)[]>([]);
  const travadoAte = useRef(0); // durante a rolagem de um clique, não muda sozinho
  useEffect(() => {
    if (!etapas.length) return;
    const livre = () => Date.now() > travadoAte.current;
    const obs = new IntersectionObserver(
      (entradas) => {
        if (!livre()) return;
        for (const e of entradas)
          if (e.isIntersecting) setAtual(Number((e.target as HTMLElement).dataset.indice));
      },
      { rootMargin: "-25% 0px -65% 0px" },
    );
    refs.current.forEach((el) => el && obs.observe(el));
    // a última etapa nunca chega à faixa observada: no fim da página, vale ela
    const noFim = () => {
      const fim = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
      if (fim && livre()) setAtual(etapas.length - 1);
    };
    window.addEventListener("scroll", noFim, { passive: true });
    return () => {
      obs.disconnect();
      window.removeEventListener("scroll", noFim);
    };
  }, [etapas]);

  // avisa antes de fechar/recarregar com alterações não salvas
  useEffect(() => {
    if (!alterada) return;
    const h = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [alterada]);

  const irPara = (i: number) => {
    setAtual(i);
    travadoAte.current = Date.now() + 900;
    refs.current[i]?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const podeSair = () => !alterada || confirm("Há alterações não salvas. Deseja sair mesmo assim?");
  const sair = (href: string) => {
    if (podeSair()) router.push(href);
  };

  const responder = useCallback((id: string, valor: string | boolean | undefined) => {
    setErros((e) => (e[id] ? { ...e, [id]: "" } : e));
    setRespostas((r) => {
      const n = { ...r };
      if (valor === undefined || valor === "") delete n[id];
      else n[id] = valor;
      return n;
    });
  }, []);

  async function salvar(concluir: boolean) {
    const faltando = config.exigir.find((x) => (x.sempre || concluir) && !preenchido(limpas, x.id));
    if (faltando) {
      setErros({ [faltando.id]: faltando.mensagem });
      setAviso({ tipo: "erro", texto: `${faltando.mensagem}${faltando.sempre ? "" : " para concluir"}.` });
      irPara(Math.max(0, etapaDaPergunta(etapas, faltando.id)));
      return;
    }
    setSalvando(concluir ? "concluir" : "rascunho");
    try {
      const r = await salvarNoServidor(limpas, concluir);
      setSalva(r);
      setRespostas(r.respostas);
      setBase(JSON.stringify(r.respostas));
      setAviso({ tipo: "ok", texto: concluir ? `${config.titulo} concluída!` : "Rascunho salvo!" });
      aoSalvar?.(r);
    } catch (e) {
      setAviso({ tipo: "erro", texto: (e as Error).message });
    } finally {
      setSalvando(null);
    }
  }

  const ultima = atual >= etapas.length - 1;
  const barraId = `barra-${config.modulo}`;
  let numero = 0;

  return (
    <Moldura
      config={config}
      pacienteId={paciente.id}
      subtitulo={subtitulo}
      status={salva ? (salva.concluida ? "concluida" : "rascunho") : null}
      stepper={<Stepper nome={config.nome} etapas={etapas} atual={atual} respostas={respostas} irPara={irPara} />}
      aoSair={sair}
    >
      {topo?.(podeSair)}

      <div className="space-y-4 pb-4" onFocus={(e) => revelarFoco(e, barraId)}>
        {etapas.map((etapa, i) => (
          <div
            key={etapa.id}
            id={`etapa-${etapa.id}`}
            data-indice={i}
            ref={(el) => {
              refs.current[i] = el;
            }}
            className="space-y-4"
          >
            {etapa.secoes.map((s) => (
              <SecaoCard
                key={s.id}
                numero={++numero}
                secao={s}
                paciente={paciente}
                respostas={respostas}
                responder={responder}
                erros={erros}
              />
            ))}
          </div>
        ))}
      </div>

      {/* barra de ações */}
      <div
        id={barraId}
        className="sticky bottom-3 z-30 mt-2 flex flex-wrap items-center gap-3 rounded-2xl border border-teal-200 bg-white/90 p-3 shadow-[0_10px_40px_-15px_rgba(36,92,82,.45)] backdrop-blur print:hidden"
      >
        <button
          type="button"
          onClick={() => (atual === 0 ? sair("/pacientes") : irPara(atual - 1))}
          aria-label="Voltar"
          className="flex h-11 shrink-0 items-center justify-center gap-2 rounded-full border-2 border-teal-600 px-3 font-bold text-teal-700 transition hover:bg-teal-50 sm:px-6"
        >
          <ArrowLeft className="size-5" />
          <span className="hidden sm:inline">Voltar</span>
        </button>

        <div className="order-first basis-full px-2 sm:order-none sm:min-w-40 sm:flex-1 sm:basis-auto">
          <p className="text-xs font-bold text-teal-700">
            {feitas} de {perguntas.length} itens respondidos
          </p>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-teal-100">
            <div
              className="h-full rounded-full bg-teal-500 transition-[width] duration-500"
              style={{ width: `${(feitas / perguntas.length) * 100}%` }}
            />
          </div>
          <p className="mt-1 text-xs text-teal-700/60">
            {alterada
              ? "Alterações não salvas"
              : salva
                ? `${salva.concluida ? "Concluída" : "Rascunho salvo"} em ${dataHora(salva.atualizadoEm)}${salva.atualizadoPorNome ? ` por ${salva.atualizadoPorNome}` : ""}`
                : "Ainda não preenchida"}
          </p>
        </div>

        <button
          type="button"
          onClick={() => salvar(false)}
          disabled={salvando !== null || (!alterada && Boolean(salva))}
          className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border-2 border-teal-600 px-3 font-bold text-teal-700 transition hover:bg-teal-50 disabled:opacity-50 sm:flex-none sm:px-5"
        >
          {salvando === "rascunho" ? <Loader2 className="size-5 animate-spin" /> : <Save className="size-5" />}
          Salvar<span className="hidden sm:inline"> rascunho</span>
        </button>
        <button
          type="button"
          onClick={() => (ultima ? salvar(true) : irPara(atual + 1))}
          disabled={salvando !== null}
          className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-teal-700 to-teal-500 px-3 font-bold text-white shadow-[0_10px_24px_-10px_rgba(36,92,82,.8)] transition hover:brightness-110 active:scale-[.98] disabled:opacity-60 sm:flex-none sm:px-6"
        >
          {salvando === "concluir" ? (
            <Loader2 className="size-5 animate-spin" />
          ) : ultima ? (
            <Check className="size-5" strokeWidth={3} />
          ) : null}
          {ultima ? (
            <>
              Concluir<span className="hidden sm:inline"> {config.nome}</span>
            </>
          ) : (
            "Continuar"
          )}
          {!ultima && <ArrowRight className="size-5" />}
        </button>
      </div>

      <Toast aviso={aviso} fechar={fecharAviso} />
    </Moldura>
  );
}

/** Se o campo focado (ex.: via Tab) ficar atrás da barra fixa, rola até ele. */
function revelarFoco(e: React.FocusEvent, barraId: string) {
  const barra = document.getElementById(barraId);
  const alvo = e.target as HTMLElement;
  if (barra && alvo.closest(`#${barraId}`) === null && alvo.getBoundingClientRect().bottom > barra.getBoundingClientRect().top)
    alvo.scrollIntoView({ block: "center", behavior: "smooth" });
}

/* ------------------------------------------------------- moldura da página */

const MENU: { titulo: string; icone: LucideIcon; modulo?: Modulo }[] = [
  { titulo: "Anamnese", icone: ClipboardList, modulo: "anamnese" },
  { titulo: "Avaliação", icone: ScanSearch, modulo: "avaliacao" },
  { titulo: "Audiometria", icone: Headphones, modulo: "audiometria" },
  { titulo: "Plano Terapêutico", icone: ListChecks, modulo: "plano" },
  { titulo: "Evolução", icone: ChartNoAxesCombined, modulo: "evolucao" },
  { titulo: "Cronograma", icone: CalendarDays, modulo: "cronograma" },
  { titulo: "Exames", icone: FileHeart, modulo: "anexos" },
  { titulo: "Documentos", icone: FileText, modulo: "documentos" },
];

export function Moldura({
  config,
  pacienteId,
  subtitulo,
  children,
  stepper,
  status,
  aoSair,
}: {
  config: CabecalhoModulo;
  pacienteId: string;
  subtitulo: string;
  children: ReactNode;
  stepper?: ReactNode;
  status?: "rascunho" | "concluida" | null;
  aoSair?: (href: string) => void;
}) {
  const ir = (href: string) => (e: React.MouseEvent) => {
    if (!aoSair) return;
    e.preventDefault();
    aoSair(href);
  };
  const IconeTitulo = config.icone;

  return (
    <div className="relative min-h-screen">
      {/* onda decorativa */}
      <svg aria-hidden viewBox="0 0 400 500" className="pointer-events-none fixed -bottom-10 -left-10 w-[30rem] text-teal-400/15 print:hidden">
        <path fill="currentColor" d="M0 120 C 120 140 180 260 260 320 S 380 420 400 500 L 0 500 Z" />
        <path fill="currentColor" d="M0 260 C 90 270 150 360 220 410 S 320 480 330 500 L 0 500 Z" />
      </svg>

      <div className="relative mx-auto max-w-[1440px] px-4 py-5 sm:px-6">
        <header className="mb-5 flex flex-wrap items-center gap-x-6 gap-y-4">
          <Link href="/pacientes" onClick={ir("/pacientes")} aria-label="FONALA - início" className="shrink-0">
            <Image src="/logo-teal.png" alt="FONALA Audiologia e Fonoterapia" width={935} height={261} priority className="h-12 w-auto sm:h-14" />
          </Link>
          <div className="hidden h-14 w-px bg-teal-500/30 sm:block" />
          <div className="flex items-center gap-4">
            <IconeTitulo className="size-12 text-teal-600" strokeWidth={1.6} />
            <div>
              <h1 className="flex items-center gap-3 text-3xl font-extrabold leading-none text-teal-700 sm:text-4xl">
                {config.titulo}
                {status && (
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[11px] font-extrabold uppercase tracking-wider ${
                      status === "concluida" ? "bg-teal-500 text-white" : "bg-blush-200 text-teal-700"
                    }`}
                  >
                    {status === "concluida" ? "Concluída" : "Rascunho"}
                  </span>
                )}
              </h1>
              <p className="mt-1 text-lg text-teal-700/80">{subtitulo}</p>
            </div>
          </div>
          {stepper && <div className="w-full xl:ml-auto xl:w-auto print:hidden">{stepper}</div>}
        </header>

        <div className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[220px_minmax(0,1fr)]">
          <aside className="min-w-0 self-start lg:sticky lg:top-5 print:hidden">
            <nav aria-label="Módulos do paciente" className="flex gap-1 overflow-x-auto rounded-2xl border border-teal-200 bg-white/75 p-3 backdrop-blur lg:flex-col">
              {MENU.map(({ titulo, icone: Icone, modulo }) => {
                const base = "flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-[15px]";
                const conteudo = (
                  <>
                    <Icone className="size-5" strokeWidth={1.8} />
                    {titulo}
                  </>
                );
                if (modulo === config.modulo)
                  return (
                    <span key={titulo} aria-current="page" className={`${base} bg-gradient-to-r from-teal-600 to-teal-500 font-bold text-white shadow-md`}>
                      {conteudo}
                    </span>
                  );
                if (modulo) {
                  const href = `/pacientes/${pacienteId}/${modulo}`;
                  return (
                    <Link key={titulo} href={href} onClick={ir(href)} className={`${base} font-semibold text-teal-800 transition hover:bg-teal-50`}>
                      {conteudo}
                    </Link>
                  );
                }
                return (
                  <span key={titulo} aria-disabled title="Disponível em breve" className={`${base} cursor-default text-teal-800/50`}>
                    {conteudo}
                  </span>
                );
              })}
            </nav>
            <div className="mt-3 hidden space-y-2 lg:block">
              <Link
                href="/pacientes"
                onClick={ir("/pacientes")}
                className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold text-teal-700 transition hover:bg-white/70"
              >
                <Users className="size-4" />
                Lista de pacientes
              </Link>
              <button
                type="button"
                onClick={() => window.print()}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold text-teal-700 transition hover:bg-white/70"
              >
                <Printer className="size-4" />
                Imprimir {config.nome}
              </button>
              <div className="pt-2">
                <MenuUsuario />
              </div>
            </div>
          </aside>

          <main className="min-w-0">{children}</main>
        </div>
      </div>
    </div>
  );
}

/** Estado de carregamento / erro com a moldura da ficha. */
export function FichaCarregando({
  config,
  pacienteId,
  erro,
}: {
  config: CabecalhoModulo;
  pacienteId: string;
  erro?: string;
}) {
  return (
    <Moldura config={config} pacienteId={pacienteId} subtitulo="">
      {erro ? (
        <div className="rounded-2xl border border-coral/30 bg-white/80 p-10 text-center">
          <p className="font-bold text-coral">{erro}</p>
          <Link href="/pacientes" className="mt-4 inline-block font-bold text-teal-600 underline">
            Voltar para pacientes
          </Link>
        </div>
      ) : (
        <div className="grid place-items-center py-24 text-teal-500">
          <Loader2 className="size-8 animate-spin" />
        </div>
      )}
    </Moldura>
  );
}

/* ----------------------------------------------------------------- stepper */

function Stepper({
  nome,
  etapas,
  atual,
  respostas,
  irPara,
}: {
  nome: string;
  etapas: Etapa[];
  atual: number;
  respostas: Respostas;
  irPara: (i: number) => void;
}) {
  return (
    <ol aria-label={`Etapas da ${nome}`} className="flex items-start">
      {etapas.map((e, i) => {
        const ativa = i === atual;
        const comResposta = e.secoes.some((s) => s.perguntas.some((p) => respondida(p, respostas)));
        return (
          <li key={e.id} className="relative flex flex-1 flex-col items-center xl:w-44 xl:flex-none">
            {i > 0 && <span aria-hidden className="absolute right-1/2 top-3.5 h-0.5 w-full -translate-x-3.5 bg-teal-500/60" />}
            <button
              type="button"
              onClick={() => irPara(i)}
              aria-current={ativa ? "step" : undefined}
              className="group relative z-10 flex flex-col items-center gap-1.5"
            >
              <span
                className={`grid size-7 place-items-center rounded-full border-2 text-sm font-extrabold transition ${
                  ativa
                    ? "scale-110 border-teal-600 bg-teal-600 text-white shadow-md"
                    : comResposta
                      ? "border-teal-500 bg-teal-200 text-teal-700"
                      : "border-teal-500 bg-white text-transparent group-hover:bg-teal-50"
                }`}
              >
                {ativa ? i + 1 : comResposta ? <Check className="size-3.5" strokeWidth={3} /> : ""}
              </span>
              <span
                className={`text-center text-xs leading-tight sm:text-sm ${
                  ativa ? "font-extrabold text-teal-800" : "hidden text-teal-800/80 sm:block"
                }`}
              >
                {i + 1}. {e.titulo}
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

/* ------------------------------------------------------------------ seções */

type Responder = (id: string, valor: string | boolean | undefined) => void;

function SecaoCard({
  numero,
  secao,
  paciente,
  respostas,
  responder,
  erros,
}: {
  numero: number;
  secao: Secao;
  paciente: Paciente;
  respostas: Respostas;
  responder: Responder;
  erros: Record<string, string>;
}) {
  const Icone = secao.icone;
  return (
    <section
      id={secao.id}
      aria-labelledby={`titulo-${secao.id}`}
      className="break-inside-avoid rounded-2xl border border-teal-200/80 bg-white/80 p-2 shadow-[0_12px_40px_-25px_rgba(36,92,82,.5)] backdrop-blur-sm"
    >
      <div className="flex items-center gap-3 rounded-xl bg-gradient-to-r from-teal-700 via-teal-500 to-teal-200 px-4 py-2 text-white">
        <Icone className="size-6" strokeWidth={1.8} />
        <h2 id={`titulo-${secao.id}`} className="text-lg font-bold">
          {numero}. {secao.titulo}
        </h2>
        {secao.dadosCadastro && (
          <Link
            href={`/pacientes/${paciente.id}`}
            className="ml-auto flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-teal-700 transition hover:bg-white print:hidden"
          >
            <Pencil className="size-3.5" />
            Editar cadastro
          </Link>
        )}
      </div>

      <div className="grid grid-cols-12 gap-x-4 gap-y-3 px-3 pb-3 pt-3">
        {secao.dadosCadastro && <DadosCadastro paciente={paciente} />}
        {secao.perguntas.map((p) => (
          <div key={p.id} className={colunas(p.col)}>
            <Campo pergunta={p} respostas={respostas} responder={responder} erro={erros[p.id] || undefined} />
          </div>
        ))}
      </div>
    </section>
  );
}

function DadosCadastro({ paciente: p }: { paciente: Paciente }) {
  const somenteLeitura = (rotulo: string, valor: string, col: Col, obrig = false, icone?: ReactNode) => (
    <div className={colunas(col)}>
      <span className={rotuloCls}>
        {rotulo}
        {obrig && <span className="text-coral"> *</span>}
      </span>
      <div className="flex items-center gap-2 rounded-lg border border-teal-200 bg-teal-50/60 px-3 text-sm text-teal-900/80">
        {icone}
        <span className="flex h-9 items-center truncate">{valor}</span>
      </div>
    </div>
  );
  return (
    <>
      {somenteLeitura("Nome completo", p.nomeCompleto, 7, true)}
      {somenteLeitura("Data de nascimento", isoParaData(p.dataNascimento), 3, true, <CalendarDays className="size-4 shrink-0 text-teal-600" />)}
      {somenteLeitura("Idade", calcularIdade(p.dataNascimento) || "--", 2)}
      {somenteLeitura("Sexo", SEXOS.find((s) => s.valor === p.sexo)?.rotulo ?? "--", 3, true)}
    </>
  );
}

/* ------------------------------------------------------------------ campos */

function Campo({
  pergunta: p,
  respostas,
  responder,
  erro,
}: {
  pergunta: Pergunta;
  respostas: Respostas;
  responder: Responder;
  erro?: string;
}) {
  const valor = respostas[p.id];
  const texto = typeof valor === "string" ? valor : "";
  const rotulo = (
    <span className={rotuloCls}>
      {p.rotulo}
      {p.obrigatoria && <span className="text-coral"> *</span>}
    </span>
  );
  const erroMsg = erro && <span className="mt-1 block text-xs font-bold text-coral">{erro}</span>;
  const Icone = p.icone;

  switch (p.tipo) {
    case "linha":
      return (
        <label className="block">
          {rotulo}
          <div className="relative flex items-center">
            {Icone && <Icone className="pointer-events-none absolute left-3 size-4 text-teal-700" />}
            <input
              type={p.email ? "email" : "text"}
              inputMode={p.mascara === "telefone" ? "tel" : undefined}
              className={`${campoCls} ${Icone ? "pl-9" : ""} ${p.sufixo ? "pr-12" : ""}`}
              placeholder={p.placeholder}
              maxLength={300}
              value={texto}
              onChange={(e) => responder(p.id, p.mascara === "telefone" ? mascaraTelefone(e.target.value) : e.target.value)}
            />
            {p.sufixo && <span className="pointer-events-none absolute right-3 text-sm font-semibold text-teal-700/60">{p.sufixo}</span>}
          </div>
        </label>
      );

    case "data":
      return (
        <label className="block">
          {rotulo}
          <input
            type="date"
            className={`${campoCls} cursor-pointer ${erro ? erroCls : ""}`}
            max={hojeIso()}
            aria-invalid={Boolean(erro) || undefined}
            value={texto}
            onChange={(e) => responder(p.id, e.target.value)}
          />
          {erroMsg}
        </label>
      );

    case "texto":
      return (
        <label className="block">
          {rotulo}
          <textarea
            className={`${campoCls} h-auto min-h-[4.5rem] resize-y py-2 ${erro ? erroCls : ""}`}
            placeholder={p.placeholder}
            maxLength={4000}
            aria-invalid={Boolean(erro) || undefined}
            value={texto}
            onChange={(e) => responder(p.id, e.target.value)}
          />
          {erroMsg}
        </label>
      );

    case "selecao":
      return (
        <label className="block">
          {rotulo}
          <div className="relative">
            <select
              className={`${campoCls} cursor-pointer appearance-none pr-9 ${texto ? "" : "text-teal-900/45"}`}
              value={texto}
              onChange={(e) => responder(p.id, e.target.value)}
            >
              <option value="">Selecione...</option>
              {/* mantém um valor salvo que saiu da lista de opções */}
              {texto && !p.opcoes.includes(texto) && <option value={texto}>{texto}</option>}
              {p.opcoes.map((o) => (
                <option key={o} value={o} className="text-teal-900">
                  {o}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-2.5 size-4 text-teal-700" />
          </div>
        </label>
      );

    case "simnao": {
      const detalheId = `${p.id}Detalhe`;
      const detalhe = respostas[detalheId];
      return (
        <div>
          {rotulo}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <div role="radiogroup" aria-label={p.rotulo} className="flex items-center gap-3">
              {([false, true] as const).map((v) => (
                <button
                  key={String(v)}
                  type="button"
                  role="radio"
                  aria-checked={valor === v}
                  onClick={() => responder(p.id, valor === v ? undefined : v)}
                  className="flex h-9 items-center gap-2 text-sm text-teal-900"
                >
                  <span
                    className={`grid size-[18px] place-items-center rounded-full border-2 transition ${
                      valor === v ? "border-teal-600" : "border-teal-400"
                    }`}
                  >
                    {valor === v && <span className="size-2 rounded-full bg-teal-600" />}
                  </span>
                  {v ? "Sim" : "Não"}
                </button>
              ))}
            </div>
            {p.detalhe && (
              <input
                className={`${campoCls} min-w-28 flex-1`}
                placeholder={p.detalhe}
                aria-label={`${p.rotulo} — detalhes`}
                disabled={valor !== true}
                maxLength={1000}
                value={typeof detalhe === "string" ? detalhe : ""}
                onChange={(e) => responder(detalheId, e.target.value)}
              />
            )}
          </div>
        </div>
      );
    }

    case "checks":
      return (
        <fieldset>
          <legend className={rotuloCls}>{p.rotulo}</legend>
          {/* 2 colunas: ordem por coluna (de cima para baixo) */}
          <div className={p.colunas === 2 ? "gap-x-6 sm:columns-2" : "flex flex-wrap gap-x-4 gap-y-2"}>
            {p.itens.map((item) => {
              const marcado = respostas[item.id] === true;
              const detalheId = `${item.id}Detalhe`;
              const detalhe = respostas[detalheId];
              return (
                <div key={item.id} className={`flex items-center gap-2 ${p.colunas === 2 ? "mb-1.5 break-inside-avoid" : ""}`}>
                  <label className="flex cursor-pointer items-center gap-2 text-sm text-teal-900">
                    <input
                      type="checkbox"
                      className="size-[18px] shrink-0 cursor-pointer rounded accent-teal-600"
                      checked={marcado}
                      onChange={(e) => responder(item.id, e.target.checked || undefined)}
                    />
                    {item.rotulo}
                  </label>
                  {item.detalhe && (
                    <input
                      className={`${campoCls} h-8 flex-1`}
                      placeholder={item.detalhe}
                      aria-label={`${item.rotulo} — detalhes`}
                      disabled={!marcado}
                      maxLength={300}
                      value={typeof detalhe === "string" ? detalhe : ""}
                      onChange={(e) => responder(detalheId, e.target.value)}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </fieldset>
      );
  }
}
