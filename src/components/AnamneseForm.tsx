"use client";

import { ClipboardList } from "lucide-react";
import { useEffect, useState } from "react";
import { ETAPAS } from "@/lib/anamnese";
import { api, type Anamnese, type Paciente } from "@/lib/api";
import type { Respostas } from "@/lib/ficha";
import { mascaraTelefone } from "@/lib/format";
import { FichaCarregando, FichaClinica, type ConfigFicha } from "./FichaClinica";

const CONFIG: ConfigFicha = {
  modulo: "anamnese",
  titulo: "Anamnese",
  nome: "anamnese",
  icone: ClipboardList,
  etapas: ETAPAS,
  exigir: [{ id: "queixaPrincipal", mensagem: "Informe a queixa principal" }],
};

type Carga = { paciente: Paciente; anamnese: Anamnese | null; inicial: Respostas };

export function AnamneseForm({ pacienteId }: { pacienteId: string }) {
  const [carga, setCarga] = useState<Carga | null>(null);
  const [erro, setErro] = useState("");

  useEffect(() => {
    Promise.all([api.obter(pacienteId), api.obterAnamnese(pacienteId)])
      .then(([paciente, anamnese]) => {
        const inicial: Respostas = { ...anamnese?.respostas };
        if (!anamnese) {
          // primeira vez: aproveita o que já está no cadastro
          if (paciente.queixa) inicial.queixaPrincipal = paciente.queixa;
          if (paciente.responsavelNome) inicial.responsavel = paciente.responsavelNome;
          if (paciente.responsavelTelefone) inicial.telefone = mascaraTelefone(paciente.responsavelTelefone);
        }
        setCarga({ paciente, anamnese, inicial });
      })
      .catch((e: Error) => setErro(e.message));
  }, [pacienteId]);

  if (!carga) return <FichaCarregando config={CONFIG} pacienteId={pacienteId} erro={erro} />;

  return (
    <FichaClinica
      config={CONFIG}
      paciente={carga.paciente}
      registro={carga.anamnese}
      inicial={carga.inicial}
      subtitulo="Avaliação inicial do paciente"
      salvar={(respostas, concluir) => api.salvarAnamnese(pacienteId, respostas, concluir)}
    />
  );
}
