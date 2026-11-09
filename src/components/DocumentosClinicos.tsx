"use client";

import { Check, FilePlus2, FileText, Loader2, Printer, Trash2, X } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { api, type Documento, type Paciente, type TipoDocumento } from "@/lib/api";
import { dataExtenso, gerarModelo, MODELOS, rotuloTipo, type Contexto } from "@/lib/documentos";
import { hojeIso } from "@/lib/ficha";
import { isoParaData } from "@/lib/format";
import { useSessao } from "@/lib/sessao";
import { FichaCarregando, Moldura, type CabecalhoModulo } from "./FichaClinica";
import { Toast, type Aviso } from "./ui";

const CABECALHO: CabecalhoModulo = { modulo: "documentos", titulo: "Documentos", nome: "documento", icone: FileText };

type Form = { tipo: TipoDocumento; titulo: string; data: string; conteudo: string };
/** documento aberto: `id` null = novo */
type Aberto = { id: string | null; form: Form; base: string } | null;

const maisRecentePrimeiro = (a: Documento, b: Documento) =>
  b.data.localeCompare(a.data) || b.criadoEm.localeCompare(a.criadoEm) || b.id.localeCompare(a.id);

/** Imprime só a folha do documento. */
function imprimirFolha() {
  document.body.classList.add("imprimindo-documento");
  const limpar = () => {
    document.body.classList.remove("imprimindo-documento");
    window.removeEventListener("afterprint", limpar);
  };
  window.addEventListener("afterprint", limpar);
  window.print();
}

export function DocumentosClinicos({ pacienteId }: { pacienteId: string }) {
  const router = useRouter();
  const { sessao } = useSessao();
  const [ctx, setCtx] = useState<Contexto | null>(null);
  const [lista, setLista] = useState<Documento[]>([]);
  const [aberto, setAberto] = useState<Aberto>(null);
  const [erro, setErro] = useState<"titulo" | "conteudo" | null>(null);
  const [ocupado, setOcupado] = useState<"salvar" | "excluir" | null>(null);
  const [erroCarga, setErroCarga] = useState("");
  const [aviso, setAviso] = useState<Aviso>(null);
  const fecharAviso = useCallback(() => setAviso(null), []);

  useEffect(() => {
    Promise.all([
      api.obter(pacienteId),
      api.listarDocumentos(pacienteId),
      api.obterAnamnese(pacienteId),
      api.listarAvaliacoes(pacienteId),
      api.listarPlanos(pacienteId),
      api.listarEvolucoes(pacienteId),
    ])
      .then(([paciente, docs, anamnese, avaliacoes, planos, evolucoes]) => {
        setCtx({
          paciente,
          anamnese,
          avaliacao: avaliacoes.find((a) => a.concluida),
          plano: planos.find((p) => p.status === "ativo") ?? planos[0],
          evolucoes,
        });
        setLista(docs);
      })
      .catch((e: Error) => setErroCarga(e.message));
  }, [pacienteId]);

  const alterado = aberto !== null && JSON.stringify(aberto.form) !== aberto.base;
  useEffect(() => {
    if (!alterado) return;
    const h = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [alterado]);

  if (!ctx) return <FichaCarregando config={CABECALHO} pacienteId={pacienteId} erro={erroCarga} />;
  const paciente: Paciente = ctx.paciente;

  const podeSair = () => !alterado || confirm("Há alterações não salvas. Deseja sair mesmo assim?");
  const abrir = (id: string | null, form: Form) => {
    setAberto({ id, form, base: JSON.stringify(form) });
    setErro(null);
  };
  const novo = (tipo: TipoDocumento) => {
    if (!podeSair()) return;
    const hoje = hojeIso();
    abrir(null, { tipo, data: hoje, ...gerarModelo(tipo, ctx, hoje) });
  };
  const ver = (d: Documento) => {
    if (aberto?.id === d.id || !podeSair()) return;
    abrir(d.id, { tipo: d.tipo, titulo: d.titulo, data: d.data, conteudo: d.conteudo });
  };
  const mudar = (campo: keyof Form, valor: string) => {
    setAberto((a) => a && { ...a, form: { ...a.form, [campo]: valor } });
    if (erro === campo) setErro(null);
  };

  const salvo = aberto?.id ? lista.find((d) => d.id === aberto.id) : undefined;
  const meu = !salvo || salvo.criadoPorId === sessao?.usuario.id;
  const autor = salvo?.criadoPorNome ?? sessao?.usuario.nome ?? "";

  async function salvar() {
    if (!aberto) return;
    const { form } = aberto;
    if (!form.titulo.trim() || !form.conteudo.trim()) {
      setErro(!form.titulo.trim() ? "titulo" : "conteudo");
      setAviso({ tipo: "erro", texto: !form.titulo.trim() ? "Informe o título do documento." : "Escreva o conteúdo do documento." });
      return;
    }
    if (form.data > hojeIso()) {
      setAviso({ tipo: "erro", texto: "A data do documento não pode ser futura." });
      return;
    }
    setOcupado("salvar");
    try {
      const d = await api.salvarDocumento(pacienteId, aberto.id, form);
      setLista((l) => [...l.filter((x) => x.id !== d.id), d].sort(maisRecentePrimeiro));
      abrir(d.id, { tipo: d.tipo, titulo: d.titulo, data: d.data, conteudo: d.conteudo });
      setAviso({ tipo: "ok", texto: aberto.id ? "Documento atualizado!" : "Documento emitido!" });
    } catch (e) {
      setAviso({ tipo: "erro", texto: (e as Error).message });
    } finally {
      setOcupado(null);
    }
  }

  async function excluir() {
    if (!salvo || !confirm(`Excluir "${salvo.titulo}" de ${isoParaData(salvo.data)}?`)) return;
    setOcupado("excluir");
    try {
      await api.removerDocumento(pacienteId, salvo.id);
      setLista((l) => l.filter((x) => x.id !== salvo.id));
      setAberto(null);
      setAviso({ tipo: "ok", texto: "Documento excluído." });
    } catch (e) {
      setAviso({ tipo: "erro", texto: (e as Error).message });
    } finally {
      setOcupado(null);
    }
  }

  return (
    <Moldura
      config={CABECALHO}
      pacienteId={pacienteId}
      subtitulo={`Documentos de ${paciente.nomeCompleto}`}
      aoSair={(href) => podeSair() && router.push(href)}
    >
      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-4 xl:grid-cols-[300px_minmax(0,1fr)]">
        {/* modelos + emitidos */}
        <aside className="space-y-4 print:hidden">
          <section aria-label="Novo documento" className="rounded-2xl border border-teal-200/80 bg-white/80 p-3 backdrop-blur-sm">
            <h2 className="mb-2 flex items-center gap-2 px-1 text-sm font-extrabold text-teal-800">
              <FilePlus2 className="size-4 text-teal-600" />
              Novo documento
            </h2>
            <div className="grid gap-1.5 sm:grid-cols-2 xl:grid-cols-1">
              {MODELOS.map((m) => (
                <button
                  key={m.tipo}
                  type="button"
                  onClick={() => novo(m.tipo)}
                  className={`rounded-xl border px-3 py-2 text-left transition hover:border-teal-400 hover:bg-teal-50 ${
                    aberto && !aberto.id && aberto.form.tipo === m.tipo ? "border-teal-500 bg-teal-50" : "border-teal-200 bg-white"
                  }`}
                >
                  <span className="block text-sm font-bold text-teal-800">{m.titulo}</span>
                  <span className="block text-xs text-teal-700/60">{m.descricao}</span>
                </button>
              ))}
            </div>
          </section>

          <section aria-label="Documentos emitidos" className="rounded-2xl border border-teal-200/80 bg-white/80 p-3 backdrop-blur-sm">
            <h2 className="mb-2 px-1 text-sm font-extrabold text-teal-800">Emitidos ({lista.length})</h2>
            {lista.length === 0 ? (
              <p className="px-1 py-3 text-sm text-teal-700/60">Nenhum documento emitido ainda.</p>
            ) : (
              <ul className="max-h-[28rem] space-y-1.5 overflow-y-auto">
                {lista.map((d) => (
                  <li key={d.id}>
                    <button
                      type="button"
                      onClick={() => ver(d)}
                      aria-current={aberto?.id === d.id || undefined}
                      className={`w-full rounded-xl border px-3 py-2 text-left transition ${
                        aberto?.id === d.id ? "border-teal-500 bg-teal-50" : "border-transparent hover:bg-teal-50/70"
                      }`}
                    >
                      <span className="block truncate text-sm font-bold text-teal-800">{d.titulo}</span>
                      <span className="block text-xs text-teal-700/60">
                        {isoParaData(d.data)} · {d.criadoPorNome}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>

        {/* folha */}
        {aberto ? (
          <section aria-label="Documento" className="min-w-0">
            <div className="mb-3 flex flex-wrap items-center gap-2 print:hidden">
              <span className="rounded-full bg-blush-200 px-2.5 py-0.5 text-[11px] font-extrabold uppercase tracking-wider text-teal-700">
                {rotuloTipo(aberto.form.tipo)}
              </span>
              <span className="text-xs font-semibold text-teal-700/60">
                {!aberto.id ? "Não emitido" : alterado ? "Alterações não salvas" : meu ? "Emitido" : `Emitido por ${autor} — somente leitura`}
              </span>
              <div className="ml-auto flex flex-wrap gap-2">
                {salvo && meu && (
                  <button
                    type="button"
                    onClick={excluir}
                    disabled={ocupado !== null}
                    className="flex h-10 items-center gap-2 rounded-xl px-3 text-sm font-bold text-coral transition hover:bg-coral/10 disabled:opacity-50"
                  >
                    {ocupado === "excluir" ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                    Excluir
                  </button>
                )}
                {!aberto.id && (
                  <button
                    type="button"
                    onClick={() => podeSair() && setAberto(null)}
                    className="flex h-10 items-center gap-2 rounded-xl px-3 text-sm font-bold text-teal-700 transition hover:bg-white/70"
                  >
                    <X className="size-4" />
                    Descartar
                  </button>
                )}
                <button
                  type="button"
                  onClick={imprimirFolha}
                  disabled={alterado || !aberto.id}
                  title={alterado || !aberto.id ? "Salve o documento antes de imprimir" : undefined}
                  className="flex h-10 items-center gap-2 rounded-xl border-2 border-teal-600 px-4 text-sm font-bold text-teal-700 transition hover:bg-teal-50 disabled:opacity-40"
                >
                  <Printer className="size-4" />
                  Imprimir
                </button>
                {meu && (
                  <button
                    type="button"
                    onClick={salvar}
                    disabled={ocupado !== null || (!alterado && Boolean(aberto.id))}
                    className="flex h-10 items-center gap-2 rounded-xl bg-gradient-to-r from-teal-700 to-teal-500 px-4 text-sm font-bold text-white shadow-[0_10px_24px_-10px_rgba(36,92,82,.8)] transition hover:brightness-110 disabled:opacity-50"
                  >
                    {ocupado === "salvar" ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" strokeWidth={3} />}
                    {aberto.id ? "Salvar alterações" : "Emitir documento"}
                  </button>
                )}
              </div>
            </div>

            <article
              id="folha-documento"
              className="mx-auto max-w-[52rem] rounded-sm bg-white px-6 py-8 text-[15px] leading-relaxed text-neutral-800 shadow-[0_20px_60px_-25px_rgba(36,92,82,.55)] sm:px-14 sm:py-12"
            >
              <header className="flex items-center justify-between gap-4 border-b-2 border-teal-500 pb-4">
                <Image src="/logo-teal.png" alt="FONALA Audiologia e Fonoterapia" width={935} height={261} className="h-12 w-auto" />
                <p className="text-right text-xs leading-snug text-teal-700/80">
                  Audiologia e Fonoterapia
                  <br />
                  Paciente: <strong className="text-teal-800">{paciente.nomeCompleto}</strong>
                </p>
              </header>

              {meu ? (
                <input
                  aria-label="Título do documento"
                  className={`mt-8 w-full rounded-md border border-dashed bg-transparent px-2 py-1 text-center text-xl font-extrabold uppercase tracking-wide text-teal-800 outline-none transition focus:border-teal-400 focus:bg-teal-50/40 print:border-none ${
                    erro === "titulo" ? "border-coral" : "border-transparent hover:border-teal-200"
                  }`}
                  maxLength={150}
                  placeholder="Título do documento"
                  value={aberto.form.titulo}
                  onChange={(e) => mudar("titulo", e.target.value)}
                />
              ) : (
                <h2 className="mt-8 text-center text-xl font-extrabold uppercase tracking-wide text-teal-800">{aberto.form.titulo}</h2>
              )}

              {meu && (
                <textarea
                  aria-label="Conteúdo do documento"
                  className={`mt-6 min-h-[22rem] w-full resize-none rounded-md border border-dashed bg-transparent px-2 py-1 outline-none transition [field-sizing:content] focus:border-teal-400 focus:bg-teal-50/40 print:hidden ${
                    erro === "conteudo" ? "border-coral" : "border-transparent hover:border-teal-200"
                  }`}
                  maxLength={20000}
                  placeholder="Escreva o conteúdo do documento..."
                  value={aberto.form.conteudo}
                  onChange={(e) => mudar("conteudo", e.target.value)}
                />
              )}
              {/* versão de leitura/impressão do texto */}
              <div className={`mt-6 whitespace-pre-line break-words px-2 ${meu ? "hidden print:block" : ""}`}>{aberto.form.conteudo}</div>

              <footer className="mt-14 space-y-12">
                <p className="text-right">
                  {meu ? (
                    <label className="inline-flex items-center gap-2 print:hidden">
                      <span className="text-sm text-neutral-500">Data:</span>
                      <input
                        type="date"
                        aria-label="Data do documento"
                        max={hojeIso()}
                        className="rounded-md border border-dashed border-teal-200 bg-transparent px-2 py-0.5 text-sm outline-none focus:border-teal-400"
                        value={aberto.form.data}
                        onChange={(e) => e.target.value && mudar("data", e.target.value)}
                      />
                    </label>
                  ) : null}
                  <span className={meu ? "hidden print:inline" : ""}>{dataExtenso(aberto.form.data)}</span>
                </p>
                <div className="mx-auto w-72 border-t border-neutral-500 pt-2 text-center text-sm">
                  <p className="font-bold">{autor}</p>
                  <p className="text-neutral-500">Fonoaudiólogo(a) · CRFa ____________</p>
                </div>
              </footer>
            </article>
          </section>
        ) : (
          <div className="grid place-items-center gap-2 rounded-2xl border border-dashed border-teal-300 bg-white/60 px-6 py-20 text-center print:hidden">
            <FileText className="size-10 text-teal-400" strokeWidth={1.5} />
            <p className="font-bold text-teal-800">Escolha um modelo para emitir um documento</p>
            <p className="max-w-md text-sm text-teal-700/70">
              O texto já vem preenchido com os dados do cadastro, da avaliação, do plano e da evolução, e pode ser editado antes de emitir.
            </p>
          </div>
        )}
      </div>

      <Toast aviso={aviso} fechar={fecharAviso} />
    </Moldura>
  );
}
