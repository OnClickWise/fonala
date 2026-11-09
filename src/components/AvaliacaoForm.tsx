"use client";

import { History, Loader2, Plus, ScanSearch, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { api, type Avaliacao, type Paciente } from "@/lib/api";
import { ETAPAS_AVALIACAO } from "@/lib/avaliacao";
import { hojeIso, type Respostas } from "@/lib/ficha";
import { isoParaData } from "@/lib/format";
import { FichaCarregando, FichaClinica, type ConfigFicha } from "./FichaClinica";
import { Toast, type Aviso } from "./ui";

const CONFIG: ConfigFicha = {
  modulo: "avaliacao",
  titulo: "Avaliação",
  nome: "avaliação",
  icone: ScanSearch,
  etapas: ETAPAS_AVALIACAO,
  exigir: [
    { id: "dataAvaliacao", mensagem: "Informe a data da avaliação", sempre: true },
    { id: "conclusao", mensagem: "Informe a conclusão" },
  ],
};

const maisRecentePrimeiro = (a: Avaliacao, b: Avaliacao) =>
  b.data.localeCompare(a.data) || b.criadoEm.localeCompare(a.criadoEm);

const tipoDe = (a: Avaliacao) =>
  typeof a.respostas.tipoAvaliacao === "string" ? a.respostas.tipoAvaliacao : "Avaliação";

/** `id` null = nova avaliação ainda não salva; `versao` muda só ao trocar de avaliação. */
type Selecao = { id: string | null; versao: number };

export function AvaliacaoForm({ pacienteId }: { pacienteId: string }) {
  const [paciente, setPaciente] = useState<Paciente | null>(null);
  const [lista, setLista] = useState<Avaliacao[]>([]);
  const [sel, setSel] = useState<Selecao>({ id: null, versao: 0 });
  const [erro, setErro] = useState("");
  const [excluindo, setExcluindo] = useState(false);
  const [aviso, setAviso] = useState<Aviso>(null);

  useEffect(() => {
    Promise.all([api.obter(pacienteId), api.listarAvaliacoes(pacienteId)])
      .then(([p, avaliacoes]) => {
        setPaciente(p);
        setLista(avaliacoes);
        setSel({ id: avaliacoes[0]?.id ?? null, versao: 1 });
      })
      .catch((e: Error) => setErro(e.message));
  }, [pacienteId]);

  if (!paciente) return <FichaCarregando config={CONFIG} pacienteId={pacienteId} erro={erro} />;

  const registro = lista.find((a) => a.id === sel.id) ?? null;
  const inicial: Respostas = registro
    ? registro.respostas
    : {
        dataAvaliacao: hojeIso(),
        tipoAvaliacao: lista.length ? "Reavaliação" : "Avaliação inicial",
      };

  const abrir = (id: string | null) => setSel((s) => ({ id, versao: s.versao + 1 }));

  async function excluir() {
    if (!registro || registro.concluida) return;
    if (!confirm(`Excluir o rascunho da avaliação de ${isoParaData(registro.data)}?`)) return;
    setExcluindo(true);
    try {
      await api.removerAvaliacao(pacienteId, registro.id);
      const resto = lista.filter((a) => a.id !== registro.id);
      setLista(resto);
      abrir(resto[0]?.id ?? null);
      setAviso({ tipo: "ok", texto: "Rascunho excluído." });
    } catch (e) {
      setAviso({ tipo: "erro", texto: (e as Error).message });
    } finally {
      setExcluindo(false);
    }
  }

  return (
    <>
      <FichaClinica
        key={sel.versao}
        config={CONFIG}
        paciente={paciente}
        registro={registro}
        inicial={inicial}
        subtitulo={registro ? `${tipoDe(registro)} de ${isoParaData(registro.data)}` : "Nova avaliação"}
        salvar={(respostas, concluir) => api.salvarAvaliacao(pacienteId, sel.id, respostas, concluir)}
        aoSalvar={(r) => {
          const salva = r as Avaliacao;
          setLista((l) => [...l.filter((a) => a.id !== salva.id), salva].sort(maisRecentePrimeiro));
          setSel((s) => ({ ...s, id: salva.id })); // mesma versão: não recarrega o formulário
        }}
        topo={(podeSair) => (
          <section
            aria-label="Avaliações do paciente"
            className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-teal-200/80 bg-white/80 p-3 backdrop-blur-sm print:hidden"
          >
            <span className="flex items-center gap-2 pl-1 text-sm font-extrabold text-teal-800">
              <History className="size-5 text-teal-600" />
              Avaliações
            </span>

            <div className="order-last flex min-w-0 basis-full gap-2 overflow-x-auto pb-0.5 sm:order-none sm:flex-1 sm:basis-0">
              {sel.id === null && (
                <span aria-current="true" className="flex shrink-0 items-center gap-2 rounded-xl border-2 border-teal-600 bg-teal-50 px-3 py-1.5 text-sm font-bold text-teal-800">
                  Nova
                  <Etiqueta tipo="nova" />
                </span>
              )}
              {lista.map((a) => {
                const ativa = a.id === sel.id;
                return (
                  <button
                    key={a.id}
                    type="button"
                    aria-current={ativa || undefined}
                    title={tipoDe(a)}
                    onClick={() => !ativa && podeSair() && abrir(a.id)}
                    className={`flex shrink-0 items-center gap-2 rounded-xl border-2 px-3 py-1.5 text-sm font-bold transition ${
                      ativa ? "border-teal-600 bg-teal-50 text-teal-800" : "border-teal-200 bg-white text-teal-700 hover:border-teal-400"
                    }`}
                  >
                    {isoParaData(a.data)}
                    <Etiqueta tipo={a.concluida ? "concluida" : "rascunho"} />
                  </button>
                );
              })}
            </div>

            <div className="ml-auto flex gap-2">
              {registro && !registro.concluida && (
                <button
                  type="button"
                  onClick={excluir}
                  disabled={excluindo}
                  className="flex h-9 items-center gap-2 rounded-xl px-3 text-sm font-bold text-coral transition hover:bg-coral/10 disabled:opacity-50"
                >
                  {excluindo ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                  Excluir rascunho
                </button>
              )}
              {sel.id !== null && (
                <button
                  type="button"
                  onClick={() => podeSair() && abrir(null)}
                  className="flex h-9 items-center gap-2 rounded-xl bg-teal-600 px-3 text-sm font-bold text-white transition hover:bg-teal-700"
                >
                  <Plus className="size-4" strokeWidth={3} />
                  Nova avaliação
                </button>
              )}
            </div>
          </section>
        )}
      />
      <Toast aviso={aviso} fechar={() => setAviso(null)} />
    </>
  );
}

function Etiqueta({ tipo }: { tipo: "nova" | "rascunho" | "concluida" }) {
  const estilos = {
    nova: "bg-blush-200 text-teal-700",
    rascunho: "bg-blush-200 text-teal-700",
    concluida: "bg-teal-500 text-white",
  };
  const textos = { nova: "Não salva", rascunho: "Rascunho", concluida: "Concluída" };
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider ${estilos[tipo]}`}>
      {textos[tipo]}
    </span>
  );
}
