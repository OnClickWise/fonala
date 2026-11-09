"use client";

import { useRef } from "react";
import { Modulos } from "./Modulos";
import { PacienteForm, type PacienteFormHandle } from "./PacienteForm";

/** Tela de novo cadastro: formulário + atalhos dos módulos ligados a ele. */
export function CadastroPaciente() {
  const form = useRef<PacienteFormHandle>(null);
  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
      <PacienteForm ref={form} />
      <Modulos aoAbrir={async (rota, titulo) => form.current?.abrirModulo(rota, titulo)} />
    </div>
  );
}
