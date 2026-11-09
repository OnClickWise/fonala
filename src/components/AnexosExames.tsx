"use client";

import {
  ChevronDown,
  Download,
  Eye,
  FileHeart,
  FileText,
  ImageIcon,
  Loader2,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState, type DragEvent } from "react";
import { api, type Anexo, type TipoExame } from "@/lib/api";
import { hojeIso } from "@/lib/ficha";
import { isoParaData } from "@/lib/format";
import { useSessao } from "@/lib/sessao";
import { FichaCarregando, Moldura, type CabecalhoModulo } from "./FichaClinica";
import { Toast, type Aviso } from "./ui";

const CABECALHO: CabecalhoModulo = { modulo: "anexos", titulo: "Anexos de Exames", nome: "exames", icone: FileHeart };

export const TIPOS_EXAME: { valor: TipoExame; rotulo: string }[] = [
  { valor: "audiometria", rotulo: "Audiometria" },
  { valor: "imitanciometria", rotulo: "Imitanciometria" },
  { valor: "emissoes", rotulo: "Emissões otoacústicas" },
  { valor: "bera", rotulo: "PEATE / BERA" },
  { valor: "processamento", rotulo: "Processamento auditivo" },
  { valor: "laudo", rotulo: "Laudo médico" },
  { valor: "imagem", rotulo: "Exame de imagem" },
  { valor: "outro", rotulo: "Outro" },
];
const rotuloExame = (t: TipoExame) => TIPOS_EXAME.find((x) => x.valor === t)!.rotulo;

const MAXIMO = 10 * 1024 * 1024;
const ACEITOS = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
const EXTENSOES = /\.(pdf|jpe?g|png|webp)$/i;

const campoCls =
  "w-full min-w-0 rounded-lg border border-teal-300/90 bg-white px-3 text-sm text-teal-900 outline-none transition placeholder:text-teal-900/40 focus:border-teal-500 focus:ring-[3px] focus:ring-teal-500/15";
const rotuloCls = "mb-1 block text-[13.5px] font-bold text-teal-800";

export const tamanhoLegivel = (b: number) =>
  b < 1024 * 1024 ? `${Math.max(1, Math.round(b / 1024))} KB` : `${(b / 1024 / 1024).toFixed(1).replace(".", ",")} MB`;

type Form = { arquivo: File | null; tipo: TipoExame; data: string; descricao: string };
const vazio = (): Form => ({ arquivo: null, tipo: "audiometria", data: hojeIso(), descricao: "" });

export function AnexosExames({ pacienteId }: { pacienteId: string }) {
  const { sessao } = useSessao();
  const [nome, setNome] = useState<string | null>(null);
  const [lista, setLista] = useState<Anexo[]>([]);
  const [form, setForm] = useState<Form>(vazio);
  const [erroArquivo, setErroArquivo] = useState("");
  const [arrastando, setArrastando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<TipoExame | "">("");
  const [visualizando, setVisualizando] = useState<{ anexo: Anexo; url: string } | null>(null);
  const [erroCarga, setErroCarga] = useState("");
  const [aviso, setAviso] = useState<Aviso>(null);
  const fecharAviso = useCallback(() => setAviso(null), []);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    Promise.all([api.obter(pacienteId), api.listarAnexos(pacienteId)])
      .then(([p, anexos]) => {
        setNome(p.nomeCompleto);
        setLista(anexos);
      })
      .catch((e: Error) => setErroCarga(e.message));
  }, [pacienteId]);

  // libera a URL do arquivo ao fechar o visualizador
  useEffect(() => {
    if (!visualizando) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setVisualizando(null);
    window.addEventListener("keydown", esc);
    return () => {
      window.removeEventListener("keydown", esc);
      URL.revokeObjectURL(visualizando.url);
    };
  }, [visualizando]);

  if (nome === null) return <FichaCarregando config={CABECALHO} pacienteId={pacienteId} erro={erroCarga} />;

  function escolher(arquivo: File | undefined) {
    if (!arquivo) return;
    if (!ACEITOS.includes(arquivo.type) && !EXTENSOES.test(arquivo.name)) {
      setErroArquivo("Formato não suportado. Envie PDF, JPG, PNG ou WEBP.");
      return;
    }
    if (arquivo.size > MAXIMO) {
      setErroArquivo(`Arquivo grande demais (${tamanhoLegivel(arquivo.size)}; máx. 10 MB).`);
      return;
    }
    setErroArquivo("");
    setForm((f) => ({ ...f, arquivo }));
  }

  const soltar = (e: DragEvent) => {
    e.preventDefault();
    setArrastando(false);
    escolher(e.dataTransfer.files[0]);
  };

  async function enviar(ev: React.FormEvent) {
    ev.preventDefault();
    if (!form.arquivo) {
      setErroArquivo("Selecione o arquivo do exame.");
      return;
    }
    if (!form.data || form.data > hojeIso()) {
      setAviso({ tipo: "erro", texto: "Informe uma data de exame válida (não futura)." });
      return;
    }
    const dados = new FormData();
    dados.append("arquivo", form.arquivo);
    dados.append("tipo", form.tipo);
    dados.append("data", form.data);
    if (form.descricao.trim()) dados.append("descricao", form.descricao.trim());
    setEnviando(true);
    try {
      const novo = await api.enviarAnexo(pacienteId, dados);
      setLista((l) => [novo, ...l].sort((a, b) => b.data.localeCompare(a.data) || b.criadoEm.localeCompare(a.criadoEm)));
      setForm(vazio());
      if (inputRef.current) inputRef.current.value = "";
      setAviso({ tipo: "ok", texto: "Exame anexado!" });
    } catch (e) {
      setAviso({ tipo: "erro", texto: (e as Error).message });
    } finally {
      setEnviando(false);
    }
  }

  async function abrir(anexo: Anexo, baixar: boolean) {
    setOcupado(`${baixar ? "baixar" : "ver"}-${anexo.id}`);
    try {
      const blob = await api.baixarAnexo(pacienteId, anexo.id);
      const url = URL.createObjectURL(blob);
      if (baixar) {
        const a = document.createElement("a");
        a.href = url;
        a.download = anexo.nomeOriginal;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 10_000);
      } else setVisualizando({ anexo, url });
    } catch (e) {
      setAviso({ tipo: "erro", texto: (e as Error).message });
    } finally {
      setOcupado(null);
    }
  }

  async function excluir(anexo: Anexo) {
    if (!confirm(`Excluir o exame "${anexo.nomeOriginal}"? O arquivo será apagado.`)) return;
    setOcupado(`excluir-${anexo.id}`);
    try {
      await api.removerAnexo(pacienteId, anexo.id);
      setLista((l) => l.filter((x) => x.id !== anexo.id));
      setAviso({ tipo: "ok", texto: "Exame excluído." });
    } catch (e) {
      setAviso({ tipo: "erro", texto: (e as Error).message });
    } finally {
      setOcupado(null);
    }
  }

  const tiposPresentes = TIPOS_EXAME.filter((t) => lista.some((a) => a.tipo === t.valor));
  const visiveis = filtro ? lista.filter((a) => a.tipo === filtro) : lista;

  return (
    <Moldura config={CABECALHO} pacienteId={pacienteId} subtitulo={`Exames de ${nome}`}>
      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-4 xl:grid-cols-[340px_minmax(0,1fr)]">
        {/* envio */}
        <form
          onSubmit={enviar}
          noValidate
          aria-label="Anexar exame"
          className="rounded-2xl border border-teal-200/80 bg-white/80 p-2 shadow-[0_12px_40px_-25px_rgba(36,92,82,.5)] backdrop-blur-sm print:hidden xl:sticky xl:top-5"
        >
          <div className="flex items-center gap-3 rounded-xl bg-gradient-to-r from-teal-700 via-teal-500 to-teal-200 px-4 py-2 text-white">
            <Upload className="size-5" />
            <h2 className="text-lg font-bold">Anexar exame</h2>
          </div>
          <div className="space-y-3 p-3">
            <label
              onDragOver={(e) => {
                e.preventDefault();
                setArrastando(true);
              }}
              onDragLeave={() => setArrastando(false)}
              onDrop={soltar}
              className={`flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed px-4 py-6 text-center transition ${
                erroArquivo
                  ? "border-coral/60 bg-coral/5"
                  : arrastando
                    ? "border-teal-500 bg-teal-50"
                    : "border-teal-300 bg-white/70 hover:border-teal-500 hover:bg-teal-50/60"
              }`}
            >
              <input
                ref={inputRef}
                type="file"
                aria-label="Arquivo do exame"
                accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
                className="sr-only"
                onChange={(e) => escolher(e.target.files?.[0])}
              />
              {form.arquivo ? (
                <>
                  {form.arquivo.type.startsWith("image/") ? (
                    <ImageIcon className="size-8 text-teal-600" />
                  ) : (
                    <FileText className="size-8 text-teal-600" />
                  )}
                  <span className="max-w-full break-all text-sm font-bold text-teal-800">{form.arquivo.name}</span>
                  <span className="text-xs text-teal-700/60">{tamanhoLegivel(form.arquivo.size)} · clique para trocar</span>
                </>
              ) : (
                <>
                  <Upload className="size-8 text-teal-500" />
                  <span className="text-sm font-bold text-teal-800">Arraste o arquivo ou clique para escolher</span>
                  <span className="text-xs text-teal-700/60">PDF, JPG, PNG ou WEBP · até 10 MB</span>
                </>
              )}
            </label>
            {erroArquivo && <p className="text-xs font-bold text-coral">{erroArquivo}</p>}

            <div className="grid grid-cols-2 gap-3">
              <label className="col-span-2 block sm:col-span-1 xl:col-span-2">
                <span className={rotuloCls}>Tipo de exame</span>
                <div className="relative">
                  <select
                    className={`${campoCls} h-9 cursor-pointer appearance-none pr-9`}
                    value={form.tipo}
                    onChange={(e) => setForm((f) => ({ ...f, tipo: e.target.value as TipoExame }))}
                  >
                    {TIPOS_EXAME.map((t) => (
                      <option key={t.valor} value={t.valor}>
                        {t.rotulo}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-2.5 size-4 text-teal-700" />
                </div>
              </label>
              <label className="col-span-2 block sm:col-span-1 xl:col-span-2">
                <span className={rotuloCls}>Data do exame</span>
                <input
                  type="date"
                  max={hojeIso()}
                  className={`${campoCls} h-9 cursor-pointer`}
                  value={form.data}
                  onChange={(e) => setForm((f) => ({ ...f, data: e.target.value }))}
                />
              </label>
              <label className="col-span-2 block">
                <span className={rotuloCls}>Descrição</span>
                <input
                  className={`${campoCls} h-9`}
                  maxLength={300}
                  placeholder="Ex.: Audiometria pré-adaptação, laudo do ORL..."
                  value={form.descricao}
                  onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
                />
              </label>
            </div>

            <button
              type="submit"
              disabled={enviando}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-teal-700 to-teal-500 font-bold text-white shadow-[0_10px_24px_-10px_rgba(36,92,82,.8)] transition hover:brightness-110 active:scale-[.98] disabled:opacity-60"
            >
              {enviando ? <Loader2 className="size-5 animate-spin" /> : <Upload className="size-5" />}
              Enviar exame
            </button>
          </div>
        </form>

        {/* exames */}
        <section aria-label="Exames anexados" className="min-w-0">
          {tiposPresentes.length > 0 && (
            <div role="radiogroup" aria-label="Filtrar exames" className="mb-3 flex flex-wrap gap-2 print:hidden">
              {[{ valor: "" as const, rotulo: "Todos" }, ...tiposPresentes].map((t) => {
                const n = t.valor ? lista.filter((a) => a.tipo === t.valor).length : lista.length;
                return (
                  <button
                    key={t.valor || "todos"}
                    type="button"
                    role="radio"
                    aria-checked={filtro === t.valor}
                    onClick={() => setFiltro(t.valor)}
                    className={`rounded-full border-2 px-3 py-1 text-sm font-bold transition ${
                      filtro === t.valor ? "border-teal-600 bg-teal-600 text-white" : "border-teal-300 bg-white/80 text-teal-700 hover:border-teal-500"
                    }`}
                  >
                    {t.rotulo} ({n})
                  </button>
                );
              })}
            </div>
          )}

          {visiveis.length === 0 ? (
            <div className="grid place-items-center gap-2 rounded-2xl border border-dashed border-teal-300 bg-white/60 px-6 py-16 text-center">
              <FileHeart className="size-10 text-teal-400" strokeWidth={1.5} />
              <p className="font-bold text-teal-800">Nenhum exame anexado ainda</p>
              <p className="text-sm text-teal-700/70">Envie audiometrias, laudos e outros exames do paciente pelo formulário ao lado.</p>
            </div>
          ) : (
            <ul className="grid gap-3 md:grid-cols-2">
              {visiveis.map((a) => {
                const imagem = a.mime.startsWith("image/");
                const Icone = imagem ? ImageIcon : FileText;
                const meu = a.enviadoPorId === sessao?.usuario.id;
                return (
                  <li key={a.id}>
                    <article
                      aria-label={`${rotuloExame(a.tipo)} — ${isoParaData(a.data)}`}
                      className="flex h-full flex-col rounded-2xl border border-teal-200/80 bg-white/85 p-4 shadow-[0_10px_30px_-22px_rgba(36,92,82,.6)] backdrop-blur-sm"
                    >
                      <div className="flex items-start gap-3">
                        <span className={`grid size-11 shrink-0 place-items-center rounded-xl ${imagem ? "bg-blush-100 text-coral" : "bg-teal-100 text-teal-700"}`}>
                          <Icone className="size-6" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="font-extrabold text-teal-800">{rotuloExame(a.tipo)}</p>
                          <p className="text-sm font-bold text-teal-700/70">{isoParaData(a.data)}</p>
                        </div>
                      </div>
                      {a.descricao && <p className="mt-2 break-words text-sm text-teal-900">{a.descricao}</p>}
                      <p className="mt-2 truncate text-xs text-teal-700/70" title={a.nomeOriginal}>
                        {a.nomeOriginal} · {tamanhoLegivel(a.tamanho)}
                      </p>
                      <p className="text-xs text-teal-700/50">Enviado por {a.enviadoPorNome}</p>
                      <div className="mt-auto flex flex-wrap gap-2 pt-3">
                        <button
                          type="button"
                          onClick={() => abrir(a, false)}
                          disabled={ocupado !== null}
                          className="flex h-9 items-center gap-1.5 rounded-xl bg-teal-600 px-3 text-sm font-bold text-white transition hover:bg-teal-700 disabled:opacity-60"
                        >
                          {ocupado === `ver-${a.id}` ? <Loader2 className="size-4 animate-spin" /> : <Eye className="size-4" />}
                          Visualizar
                        </button>
                        <button
                          type="button"
                          onClick={() => abrir(a, true)}
                          disabled={ocupado !== null}
                          className="flex h-9 items-center gap-1.5 rounded-xl border-2 border-teal-500 px-3 text-sm font-bold text-teal-700 transition hover:bg-teal-50 disabled:opacity-60"
                        >
                          {ocupado === `baixar-${a.id}` ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
                          Baixar
                        </button>
                        {meu && (
                          <button
                            type="button"
                            onClick={() => excluir(a)}
                            disabled={ocupado !== null}
                            aria-label={`Excluir ${a.nomeOriginal}`}
                            className="ml-auto grid size-9 place-items-center rounded-xl text-coral transition hover:bg-coral/10 disabled:opacity-60"
                          >
                            {ocupado === `excluir-${a.id}` ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                          </button>
                        )}
                      </div>
                    </article>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      {/* visualizador */}
      {visualizando && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Visualizar ${visualizando.anexo.nomeOriginal}`}
          className="fixed inset-0 z-50 flex flex-col bg-teal-950/70 p-3 backdrop-blur-sm sm:p-6"
          onClick={(e) => e.target === e.currentTarget && setVisualizando(null)}
        >
          <div className="mx-auto flex w-full max-w-5xl items-center gap-3 rounded-t-2xl bg-white px-4 py-3">
            <p className="min-w-0 flex-1 truncate font-bold text-teal-800">
              {rotuloExame(visualizando.anexo.tipo)} · {isoParaData(visualizando.anexo.data)}
            </p>
            <a
              href={visualizando.url}
              download={visualizando.anexo.nomeOriginal}
              className="flex h-9 items-center gap-1.5 rounded-xl border-2 border-teal-500 px-3 text-sm font-bold text-teal-700 hover:bg-teal-50"
            >
              <Download className="size-4" />
              Baixar
            </a>
            <button
              type="button"
              onClick={() => setVisualizando(null)}
              aria-label="Fechar"
              className="grid size-9 place-items-center rounded-xl text-teal-700 hover:bg-teal-50"
            >
              <X className="size-5" />
            </button>
          </div>
          <div className="mx-auto flex min-h-0 w-full max-w-5xl flex-1 items-center justify-center overflow-auto rounded-b-2xl bg-neutral-100">
            {visualizando.anexo.mime.startsWith("image/") ? (
              // eslint-disable-next-line @next/next/no-img-element -- blob local, sem otimização
              <img src={visualizando.url} alt={visualizando.anexo.nomeOriginal} className="max-h-full max-w-full object-contain" />
            ) : (
              <iframe src={visualizando.url} title={visualizando.anexo.nomeOriginal} className="size-full min-h-[70vh] bg-white" />
            )}
          </div>
        </div>
      )}

      <Toast aviso={aviso} fechar={fecharAviso} />
    </Moldura>
  );
}
