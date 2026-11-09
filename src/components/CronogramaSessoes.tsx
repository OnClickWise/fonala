"use client";

import {
  CalendarCheck,
  CalendarClock,
  CalendarDays,
  CalendarX,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Loader2,
  NotebookPen,
  Plus,
  Repeat,
  Trash2,
  X,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { api, type Agendamento, type StatusAgendamento, type UsuarioResumo } from "@/lib/api";
import { hojeIso } from "@/lib/ficha";
import { isoParaData } from "@/lib/format";
import { useSessao } from "@/lib/sessao";
import { FichaCarregando, Moldura, type CabecalhoModulo } from "./FichaClinica";
import { Toast, type Aviso } from "./ui";

const CABECALHO: CabecalhoModulo = { modulo: "cronograma", titulo: "Cronograma de Sessões", nome: "cronograma", icone: CalendarDays };

const STATUS: Record<StatusAgendamento, { rotulo: string; cor: string; ponto: string }> = {
  agendada: { rotulo: "Agendada", cor: "bg-teal-100 text-teal-800", ponto: "bg-teal-400" },
  realizada: { rotulo: "Realizada", cor: "bg-teal-600 text-white", ponto: "bg-teal-700" },
  falta: { rotulo: "Falta", cor: "bg-coral/15 text-coral", ponto: "bg-coral" },
  cancelada: { rotulo: "Cancelada", cor: "bg-neutral-200 text-neutral-600 line-through", ponto: "bg-neutral-400" },
};

const DURACOES = [30, 40, 45, 50, 60, 90];
const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

const campoCls =
  "w-full min-w-0 rounded-lg border border-teal-300/90 bg-white px-3 text-sm text-teal-900 outline-none transition placeholder:text-teal-900/40 focus:border-teal-500 focus:ring-[3px] focus:ring-teal-500/15";
const rotuloCls = "mb-1 block text-[13.5px] font-bold text-teal-800";

const diaSemana = (iso: string) => {
  const [a, m, d] = iso.split("-").map(Number);
  return new Date(a, m - 1, d).toLocaleDateString("pt-BR", { weekday: "long" });
};
/** só a primeira letra maiúscula ("Segunda-feira", "Novembro de 2026") */
const maiuscula = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const fimDe = (hora: string, dur: number) => {
  const [h, m] = hora.split(":").map(Number);
  const t = h * 60 + m + dur;
  return `${String(Math.floor(t / 60) % 24).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
};
const ordenar = (l: Agendamento[]) => [...l].sort((a, b) => a.data.localeCompare(b.data) || a.hora.localeCompare(b.hora));

type Form = { data: string; hora: string; duracao: string; profissionalId: string; repetir: boolean; semanas: string; observacao: string };

export function CronogramaSessoes({ pacienteId }: { pacienteId: string }) {
  const { sessao } = useSessao();
  const [nome, setNome] = useState<string | null>(null);
  const [lista, setLista] = useState<Agendamento[]>([]);
  const [usuarios, setUsuarios] = useState<UsuarioResumo[]>([]);
  const hoje = hojeIso();
  const [mes, setMes] = useState(hoje.slice(0, 7));
  const [diaSel, setDiaSel] = useState<string | null>(null);
  const [aba, setAba] = useState<"proximas" | "anteriores">("proximas");
  const [form, setForm] = useState<Form>({ data: hoje, hora: "", duracao: "45", profissionalId: "", repetir: false, semanas: "4", observacao: "" });
  const [erroHora, setErroHora] = useState(false);
  const [agendando, setAgendando] = useState(false);
  const [remarcando, setRemarcando] = useState<{ id: string; data: string; hora: string } | null>(null);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [erroCarga, setErroCarga] = useState("");
  const [aviso, setAviso] = useState<Aviso>(null);
  const fecharAviso = useCallback(() => setAviso(null), []);

  useEffect(() => {
    Promise.all([api.obter(pacienteId), api.listarAgendamentos(pacienteId), api.listarUsuarios()])
      .then(([p, ags, us]) => {
        setNome(p.nomeCompleto);
        setLista(ags);
        setUsuarios(us);
      })
      .catch((e: Error) => setErroCarga(e.message));
  }, [pacienteId]);

  if (nome === null) return <FichaCarregando config={CABECALHO} pacienteId={pacienteId} erro={erroCarga} />;

  const profissionalPadrao = form.profissionalId || sessao?.usuario.id || "";
  const set = <K extends keyof Form>(k: K) => (v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));

  async function agendar(ev: React.FormEvent) {
    ev.preventDefault();
    if (!form.hora) {
      setErroHora(true);
      setAviso({ tipo: "erro", texto: "Informe o horário da sessão." });
      return;
    }
    if (form.data < hoje) {
      setAviso({ tipo: "erro", texto: "Não é possível agendar no passado." });
      return;
    }
    setAgendando(true);
    try {
      const novos = await api.agendar(pacienteId, {
        data: form.data,
        hora: form.hora,
        duracao: Number(form.duracao),
        profissionalId: profissionalPadrao || undefined,
        observacao: form.observacao.trim() || null,
        semanas: form.repetir ? Number(form.semanas) : 1,
      });
      setLista((l) => ordenar([...l, ...novos]));
      setForm((f) => ({ ...f, hora: "", observacao: "", repetir: false }));
      setMes(form.data.slice(0, 7));
      setAviso({ tipo: "ok", texto: novos.length > 1 ? `${novos.length} sessões agendadas!` : "Sessão agendada!" });
    } catch (e) {
      setAviso({ tipo: "erro", texto: (e as Error).message });
    } finally {
      setAgendando(false);
    }
  }

  async function atualizar(ag: Agendamento, dados: Parameters<typeof api.atualizarAgendamento>[2], msg: string) {
    setOcupado(ag.id);
    try {
      const novo = await api.atualizarAgendamento(pacienteId, ag.id, dados);
      setLista((l) => ordenar(l.map((x) => (x.id === novo.id ? novo : x))));
      setRemarcando(null);
      setAviso({ tipo: "ok", texto: msg });
    } catch (e) {
      setAviso({ tipo: "erro", texto: (e as Error).message });
    } finally {
      setOcupado(null);
    }
  }

  async function excluir(ag: Agendamento, serie: boolean) {
    const pergunta = serie
      ? `Excluir a sessão de ${isoParaData(ag.data)} e as próximas sessões agendadas desta série?`
      : `Excluir a sessão de ${isoParaData(ag.data)} às ${ag.hora}?`;
    if (!confirm(pergunta)) return;
    setOcupado(ag.id);
    try {
      await api.removerAgendamento(pacienteId, ag.id, serie);
      setLista((l) =>
        l.filter((x) =>
          serie ? !(x.id === ag.id || (x.serieId === ag.serieId && x.status === "agendada" && x.data >= ag.data)) : x.id !== ag.id,
        ),
      );
      setAviso({ tipo: "ok", texto: serie ? "Sessões da série excluídas." : "Sessão excluída." });
    } catch (e) {
      setAviso({ tipo: "erro", texto: (e as Error).message });
    } finally {
      setOcupado(null);
    }
  }

  // resumo
  const proximas = lista.filter((a) => a.data >= hoje && a.status === "agendada");
  const realizadas = lista.filter((a) => a.status === "realizada").length;
  const faltas = lista.filter((a) => a.status === "falta").length;
  const proxima = proximas[0];

  // calendário
  const [ano, mesN] = mes.split("-").map(Number);
  const primeiroDia = new Date(ano, mesN - 1, 1).getDay();
  const diasNoMes = new Date(ano, mesN, 0).getDate();
  const celulas: (string | null)[] = [
    ...Array<null>(primeiroDia).fill(null),
    ...Array.from({ length: diasNoMes }, (_, i) => `${mes}-${String(i + 1).padStart(2, "0")}`),
  ];
  const porDia = new Map<string, Agendamento[]>();
  for (const a of lista) porDia.set(a.data, [...(porDia.get(a.data) ?? []), a]);
  const mudarMes = (delta: number) => {
    const d = new Date(ano, mesN - 1 + delta, 1);
    setMes(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  };
  const nomeMes = new Date(ano, mesN - 1, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  const visiveis = diaSel
    ? lista.filter((a) => a.data === diaSel)
    : aba === "proximas"
      ? lista.filter((a) => a.data >= hoje)
      : lista.filter((a) => a.data < hoje).reverse();

  return (
    <Moldura config={CABECALHO} pacienteId={pacienteId} subtitulo={`Agenda de ${nome}`}>
      <section aria-label="Resumo" className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Indicador
          icone={CalendarClock}
          rotulo="Próxima sessão"
          valor={proxima ? `${isoParaData(proxima.data).slice(0, 5)} · ${proxima.hora}` : "--"}
          detalhe={proxima ? maiuscula(diaSemana(proxima.data)) : undefined}
        />
        <Indicador icone={CalendarDays} rotulo="Agendadas" valor={String(proximas.length)} />
        <Indicador icone={CalendarCheck} rotulo="Realizadas" valor={String(realizadas)} />
        <Indicador icone={CalendarX} rotulo="Faltas" valor={String(faltas)} />
      </section>

      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
        {/* agendar */}
        <form
          onSubmit={agendar}
          noValidate
          aria-label="Agendar sessão"
          className="rounded-2xl border border-teal-200/80 bg-white/80 p-2 shadow-[0_12px_40px_-25px_rgba(36,92,82,.5)] backdrop-blur-sm print:hidden xl:sticky xl:top-5"
        >
          <div className="flex items-center gap-3 rounded-xl bg-gradient-to-r from-teal-700 via-teal-500 to-teal-200 px-4 py-2 text-white">
            <Plus className="size-5" strokeWidth={2.5} />
            <h2 className="text-lg font-bold">Agendar sessão</h2>
          </div>
          <div className="grid grid-cols-2 gap-3 p-3">
            <label className="block">
              <span className={rotuloCls}>Data</span>
              <input type="date" min={hoje} className={`${campoCls} h-9 cursor-pointer`} value={form.data} onChange={(e) => set("data")(e.target.value)} />
            </label>
            <label className="block">
              <span className={rotuloCls}>Horário</span>
              <input
                type="time"
                step={300}
                className={`${campoCls} h-9 cursor-pointer ${erroHora ? "border-coral ring-[3px] ring-coral/15" : ""}`}
                value={form.hora}
                onChange={(e) => {
                  set("hora")(e.target.value);
                  setErroHora(false);
                }}
              />
            </label>
            <Selecao rotulo="Duração" valor={form.duracao} mudar={set("duracao")} opcoes={DURACOES.map((d) => [String(d), `${d} min`])} />
            <Selecao
              rotulo="Profissional"
              valor={profissionalPadrao}
              mudar={set("profissionalId")}
              opcoes={usuarios.map((u) => [u.id, u.nome])}
            />
            <label className="col-span-2 flex cursor-pointer items-center gap-2 text-sm font-bold text-teal-800">
              <input type="checkbox" className="size-[18px] accent-teal-600" checked={form.repetir} onChange={(e) => set("repetir")(e.target.checked)} />
              <Repeat className="size-4 text-teal-600" />
              Repetir toda semana
            </label>
            {form.repetir && (
              <label className="col-span-2 block">
                <span className={rotuloCls}>Número de sessões</span>
                <input
                  type="number"
                  min={2}
                  max={52}
                  className={`${campoCls} h-9`}
                  value={form.semanas}
                  onChange={(e) => set("semanas")(e.target.value)}
                />
                <span className="mt-1 block text-xs text-teal-700/60">
                  Toda {diaSemana(form.data)} às {form.hora || "--:--"}, até{" "}
                  {(() => {
                    const n = Math.min(52, Math.max(2, Number(form.semanas) || 2));
                    const [a, m, d] = form.data.split("-").map(Number);
                    const fim = new Date(a, m - 1, d + (n - 1) * 7);
                    return fim.toLocaleDateString("pt-BR");
                  })()}
                </span>
              </label>
            )}
            <label className="col-span-2 block">
              <span className={rotuloCls}>Observação</span>
              <input className={`${campoCls} h-9`} maxLength={300} placeholder="Ex.: sessão com a família" value={form.observacao} onChange={(e) => set("observacao")(e.target.value)} />
            </label>
            <button
              type="submit"
              disabled={agendando}
              className="col-span-2 flex h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-teal-700 to-teal-500 font-bold text-white shadow-[0_10px_24px_-10px_rgba(36,92,82,.8)] transition hover:brightness-110 active:scale-[.98] disabled:opacity-60"
            >
              {agendando ? <Loader2 className="size-5 animate-spin" /> : <CalendarCheck className="size-5" />}
              Agendar
            </button>
          </div>
        </form>

        <div className="min-w-0 space-y-4">
          {/* calendário */}
          <section aria-label="Calendário" className="rounded-2xl border border-teal-200/80 bg-white/80 p-3 backdrop-blur-sm">
            <div className="mb-2 flex items-center gap-2">
              <button type="button" onClick={() => mudarMes(-1)} aria-label="Mês anterior" className="grid size-8 place-items-center rounded-full text-teal-700 hover:bg-teal-50">
                <ChevronLeft className="size-5" />
              </button>
              <h2 className="flex-1 text-center font-extrabold text-teal-800">{maiuscula(nomeMes)}</h2>
              <button type="button" onClick={() => mudarMes(1)} aria-label="Próximo mês" className="grid size-8 place-items-center rounded-full text-teal-700 hover:bg-teal-50">
                <ChevronRight className="size-5" />
              </button>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center">
              {DIAS_SEMANA.map((d) => (
                <span key={d} className="py-1 text-[11px] font-extrabold uppercase text-teal-700/60">
                  {d}
                </span>
              ))}
              {celulas.map((dia, i) =>
                dia ? (
                  <button
                    key={dia}
                    type="button"
                    aria-label={`${isoParaData(dia)}${porDia.get(dia)?.length ? ` — ${porDia.get(dia)!.length} sessão(ões)` : ""}`}
                    aria-pressed={diaSel === dia}
                    onClick={() => {
                      setDiaSel((s) => (s === dia ? null : dia));
                      if (dia >= hoje) set("data")(dia);
                    }}
                    className={`flex h-12 flex-col items-center justify-center gap-1 rounded-lg text-sm font-bold transition ${
                      diaSel === dia
                        ? "bg-teal-600 text-white"
                        : dia === hoje
                          ? "bg-teal-50 text-teal-800 ring-2 ring-teal-400"
                          : dia < hoje
                            ? "text-teal-900/40 hover:bg-teal-50"
                            : "text-teal-800 hover:bg-teal-50"
                    }`}
                  >
                    {Number(dia.slice(8))}
                    <span className="flex h-1.5 gap-0.5">
                      {(porDia.get(dia) ?? []).slice(0, 4).map((a) => (
                        <span key={a.id} className={`size-1.5 rounded-full ${diaSel === dia ? "bg-white" : STATUS[a.status].ponto}`} />
                      ))}
                    </span>
                  </button>
                ) : (
                  <span key={`v${i}`} />
                ),
              )}
            </div>
          </section>

          {/* lista */}
          <section aria-label="Sessões" className="min-w-0">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              {diaSel ? (
                <p className="flex items-center gap-2 text-sm font-bold text-teal-800">
                  Sessões de {isoParaData(diaSel)}
                  <button type="button" onClick={() => setDiaSel(null)} className="flex items-center gap-1 rounded-full bg-white/80 px-2 py-0.5 text-xs text-teal-700 hover:bg-white">
                    <X className="size-3" /> limpar
                  </button>
                </p>
              ) : (
                <div role="radiogroup" aria-label="Período" className="flex rounded-full border border-teal-300 bg-white/80 p-0.5">
                  {(
                    [
                      ["proximas", "Próximas"],
                      ["anteriores", "Anteriores"],
                    ] as const
                  ).map(([v, r]) => (
                    <button
                      key={v}
                      type="button"
                      role="radio"
                      aria-checked={aba === v}
                      onClick={() => setAba(v)}
                      className={`rounded-full px-3 py-1 text-sm font-bold transition ${aba === v ? "bg-teal-600 text-white" : "text-teal-700 hover:bg-teal-50"}`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {visiveis.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-teal-300 bg-white/60 px-6 py-10 text-center text-sm font-semibold text-teal-700/70">
                {diaSel ? "Nenhuma sessão neste dia." : aba === "proximas" ? "Nenhuma sessão agendada." : "Nenhuma sessão anterior."}
              </p>
            ) : (
              <ul className="space-y-2">
                {visiveis.map((a) => {
                  const st = STATUS[a.status];
                  const ate = a.data <= hoje;
                  const editando = remarcando?.id === a.id;
                  return (
                    <li key={a.id}>
                      <article
                        aria-label={`Sessão de ${isoParaData(a.data)} às ${a.hora}`}
                        className="rounded-2xl border border-teal-200/80 bg-white/85 p-3 shadow-[0_10px_30px_-22px_rgba(36,92,82,.6)] backdrop-blur-sm"
                      >
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-teal-50 text-center leading-none text-teal-800">
                            <span className="text-base font-extrabold">{a.data.slice(8)}</span>
                            <span className="text-[10px] font-bold uppercase">
                              {new Date(Number(a.data.slice(0, 4)), Number(a.data.slice(5, 7)) - 1, 1).toLocaleDateString("pt-BR", { month: "short" }).replace(".", "")}
                            </span>
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="flex flex-wrap items-center gap-2 font-extrabold text-teal-800">
                              <span>{maiuscula(diaSemana(a.data))}</span>
                              <span className="flex items-center gap-1 text-sm font-bold text-teal-700/80">
                                <Clock className="size-3.5" />
                                {a.hora}–{fimDe(a.hora, a.duracao)}
                              </span>
                              <span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide ${st.cor}`}>{st.rotulo}</span>
                              {a.serieId && (
                                <span title="Faz parte de uma série semanal" className="flex items-center gap-1 text-[11px] font-bold text-teal-600">
                                  <Repeat className="size-3" /> semanal
                                </span>
                              )}
                            </p>
                            <p className="text-xs text-teal-700/70">
                              {a.profissionalNome}
                              {a.observacao && <> · {a.observacao}</>}
                            </p>
                          </div>
                        </div>

                        {editando ? (
                          <div className="mt-3 flex flex-wrap items-end gap-2 rounded-xl bg-teal-50/70 p-2">
                            <label className="block">
                              <span className="mb-0.5 block text-xs font-bold text-teal-800">Nova data</span>
                              <input
                                type="date"
                                min={hoje}
                                aria-label="Nova data"
                                className={`${campoCls} h-9`}
                                value={remarcando.data}
                                onChange={(e) => setRemarcando({ ...remarcando, data: e.target.value })}
                              />
                            </label>
                            <label className="block">
                              <span className="mb-0.5 block text-xs font-bold text-teal-800">Horário</span>
                              <input
                                type="time"
                                step={300}
                                aria-label="Novo horário"
                                className={`${campoCls} h-9`}
                                value={remarcando.hora}
                                onChange={(e) => setRemarcando({ ...remarcando, hora: e.target.value })}
                              />
                            </label>
                            <button
                              type="button"
                              onClick={() => atualizar(a, { data: remarcando.data, hora: remarcando.hora }, "Sessão remarcada!")}
                              disabled={ocupado === a.id}
                              className="flex h-9 items-center gap-1 rounded-xl bg-teal-600 px-3 text-sm font-bold text-white hover:bg-teal-700 disabled:opacity-60"
                            >
                              {ocupado === a.id ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                              Salvar
                            </button>
                            <button type="button" onClick={() => setRemarcando(null)} className="h-9 rounded-xl px-3 text-sm font-bold text-teal-700 hover:bg-white">
                              Cancelar
                            </button>
                          </div>
                        ) : (
                          <div className="mt-2 flex flex-wrap items-center gap-1.5 pl-14">
                            {a.status === "agendada" && ate && (
                              <>
                                <Acao onClick={() => atualizar(a, { status: "realizada" }, "Sessão marcada como realizada.")} ocupado={ocupado === a.id} principal>
                                  Realizada
                                </Acao>
                                <Acao onClick={() => atualizar(a, { status: "falta" }, "Falta registrada.")} ocupado={ocupado === a.id}>
                                  Falta
                                </Acao>
                              </>
                            )}
                            {a.status === "agendada" && (
                              <>
                                <Acao onClick={() => setRemarcando({ id: a.id, data: a.data < hoje ? hoje : a.data, hora: a.hora })} ocupado={ocupado === a.id}>
                                  Remarcar
                                </Acao>
                                <Acao onClick={() => atualizar(a, { status: "cancelada" }, "Sessão cancelada.")} ocupado={ocupado === a.id}>
                                  Cancelar
                                </Acao>
                              </>
                            )}
                            {a.status !== "agendada" && (
                              <Acao onClick={() => atualizar(a, { status: "agendada" }, "Sessão reaberta.")} ocupado={ocupado === a.id}>
                                Desfazer
                              </Acao>
                            )}
                            {a.status === "realizada" && (
                              <Link
                                href={`/pacientes/${pacienteId}/evolucao?data=${a.data}`}
                                className="flex h-8 items-center gap-1.5 rounded-lg bg-blush-100 px-2.5 text-xs font-bold text-teal-800 hover:bg-blush-200"
                              >
                                <NotebookPen className="size-3.5" />
                                Registrar evolução
                              </Link>
                            )}
                            <span className="ml-auto flex gap-1">
                              {a.serieId && a.status === "agendada" && (
                                <button
                                  type="button"
                                  onClick={() => excluir(a, true)}
                                  disabled={ocupado === a.id}
                                  className="h-8 rounded-lg px-2 text-xs font-bold text-coral hover:bg-coral/10 disabled:opacity-50"
                                >
                                  Excluir série
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => excluir(a, false)}
                                disabled={ocupado === a.id}
                                aria-label={`Excluir sessão de ${isoParaData(a.data)}`}
                                className="grid size-8 place-items-center rounded-lg text-coral hover:bg-coral/10 disabled:opacity-50"
                              >
                                <Trash2 className="size-4" />
                              </button>
                            </span>
                          </div>
                        )}
                      </article>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      </div>

      <Toast aviso={aviso} fechar={fecharAviso} />
    </Moldura>
  );
}

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

function Selecao({ rotulo, valor, mudar, opcoes }: { rotulo: string; valor: string; mudar: (v: string) => void; opcoes: [string, string][] }) {
  return (
    <label className="block">
      <span className={rotuloCls}>{rotulo}</span>
      <div className="relative">
        <select className={`${campoCls} h-9 cursor-pointer appearance-none pr-8`} value={valor} onChange={(e) => mudar(e.target.value)}>
          {opcoes.map(([v, r]) => (
            <option key={v} value={v}>
              {r}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2.5 top-2.5 size-4 text-teal-700" />
      </div>
    </label>
  );
}

function Acao({ onClick, ocupado, principal, children }: { onClick: () => void; ocupado: boolean; principal?: boolean; children: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={ocupado}
      className={`h-8 rounded-lg px-2.5 text-xs font-bold transition disabled:opacity-50 ${
        principal ? "bg-teal-600 text-white hover:bg-teal-700" : "border border-teal-300 bg-white text-teal-700 hover:border-teal-500"
      }`}
    >
      {children}
    </button>
  );
}
