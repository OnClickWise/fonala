"use client";

import { ClipboardList, Loader2, Pencil, Phone, ScanSearch, Search, Trash2, UserRound } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { api, SEXOS, type Paciente } from "@/lib/api";
import { calcularIdade, isoParaData, mascaraCpf, mascaraTelefone } from "@/lib/format";
import { Toast, type Aviso } from "./ui";

export function ListaPacientes() {
  const [busca, setBusca] = useState("");
  const [pacientes, setPacientes] = useState<Paciente[] | null>(null);
  const [aviso, setAviso] = useState<Aviso>(null);
  const fecharAviso = useCallback(() => setAviso(null), []);

  useEffect(() => {
    const t = setTimeout(() => {
      api
        .listar(busca)
        .then(setPacientes)
        .catch((e: Error) => {
          setPacientes([]);
          setAviso({ tipo: "erro", texto: e.message });
        });
    }, 250);
    return () => clearTimeout(t);
  }, [busca]);

  async function remover(p: Paciente) {
    if (!confirm(`Excluir o cadastro de ${p.nomeCompleto}?`)) return;
    try {
      await api.remover(p.id);
      setPacientes((lista) => lista?.filter((x) => x.id !== p.id) ?? null);
      setAviso({ tipo: "ok", texto: "Cadastro excluído." });
    } catch (e) {
      setAviso({ tipo: "erro", texto: (e as Error).message });
    }
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-teal-200 bg-white/75 shadow-[0_20px_50px_-25px_rgba(36,92,82,.45)] backdrop-blur-sm">
      <div className="flex flex-wrap items-center gap-4 bg-gradient-to-r from-teal-600 to-teal-500 px-6 py-4">
        <div className="flex flex-1 items-center gap-3 rounded-full bg-white/95 px-4 py-2.5">
          <Search className="size-5 text-teal-500" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome ou CPF..."
            className="w-full bg-transparent text-teal-800 outline-none placeholder:text-teal-800/40"
          />
        </div>
        {pacientes && (
          <span className="text-sm font-bold text-white/90">
            {pacientes.length} {pacientes.length === 1 ? "paciente" : "pacientes"}
          </span>
        )}
      </div>

      {pacientes === null ? (
        <div className="grid place-items-center py-16 text-teal-500">
          <Loader2 className="size-8 animate-spin" />
        </div>
      ) : pacientes.length === 0 ? (
        <div className="py-16 text-center text-teal-700/70">
          <UserRound className="mx-auto mb-3 size-10" />
          {busca ? "Nenhum paciente encontrado." : "Nenhum paciente cadastrado ainda."}
        </div>
      ) : (
        <ul className="divide-y divide-teal-100">
          {pacientes.map((p) => (
            <li key={p.id} className="animate-surgir flex flex-wrap items-center gap-4 px-6 py-4 transition hover:bg-teal-50/50">
              <span className="grid size-12 shrink-0 place-items-center rounded-full bg-gradient-to-br from-blush-200 to-blush-300 text-lg font-extrabold text-teal-700">
                {p.nomeCompleto.charAt(0).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold text-teal-800">{p.nomeCompleto}</p>
                <p className="text-sm text-teal-700/75">
                  CPF {mascaraCpf(p.cpf)} · {isoParaData(p.dataNascimento)} ({calcularIdade(p.dataNascimento)}) ·{" "}
                  {SEXOS.find((s) => s.valor === p.sexo)?.rotulo}
                </p>
                {p.responsavelNome && (
                  <p className="mt-0.5 flex items-center gap-1.5 text-xs text-teal-700/60">
                    Resp.: {p.responsavelNome}
                    {p.responsavelTelefone && (
                      <>
                        <Phone className="ml-1 size-3" /> {mascaraTelefone(p.responsavelTelefone)}
                      </>
                    )}
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <Link
                  href={`/pacientes/${p.id}/anamnese`}
                  aria-label={`Anamnese de ${p.nomeCompleto}`}
                  className="flex h-10 items-center gap-2 rounded-full bg-teal-500 px-4 text-sm font-bold text-white transition hover:bg-teal-600"
                >
                  <ClipboardList className="size-4" />
                  <span className="hidden sm:inline">Anamnese</span>
                </Link>
                <Link
                  href={`/pacientes/${p.id}/avaliacao`}
                  aria-label={`Avaliação de ${p.nomeCompleto}`}
                  className="flex h-10 items-center gap-2 rounded-full border-2 border-teal-500 px-4 text-sm font-bold text-teal-700 transition hover:bg-teal-500 hover:text-white"
                >
                  <ScanSearch className="size-4" />
                  <span className="hidden sm:inline">Avaliação</span>
                </Link>
                <Link
                  href={`/pacientes/${p.id}`}
                  aria-label={`Editar ${p.nomeCompleto}`}
                  className="grid size-10 place-items-center rounded-full border border-teal-300 text-teal-600 transition hover:bg-teal-500 hover:text-white"
                >
                  <Pencil className="size-4" />
                </Link>
                <button
                  onClick={() => remover(p)}
                  aria-label={`Excluir ${p.nomeCompleto}`}
                  className="grid size-10 place-items-center rounded-full border border-coral/40 text-coral transition hover:bg-coral hover:text-white"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <Toast aviso={aviso} fechar={fecharAviso} />
    </div>
  );
}
