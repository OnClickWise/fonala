import { Suspense } from "react";
import { LinkPacientes } from "@/components/LinkPacientes";
import { Modulos } from "@/components/Modulos";
import { PacienteForm } from "@/components/PacienteForm";
import { Shell } from "@/components/Shell";

export const metadata = { title: "Editar paciente · FONALA" };

async function Conteudo({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
      <PacienteForm id={id} />
      <Modulos pacienteId={id} />
    </div>
  );
}

export default function EditarPage({ params }: PageProps<"/pacientes/[id]">) {
  return (
    <Shell titulo="Editar Paciente" acoes={<LinkPacientes />}>
      <Suspense>
        <Conteudo params={params} />
      </Suspense>
    </Shell>
  );
}
