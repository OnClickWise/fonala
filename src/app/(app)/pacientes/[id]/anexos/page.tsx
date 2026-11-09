import { Suspense } from "react";
import { AnexosExames } from "@/components/AnexosExames";

export const metadata = { title: "Anexos de Exames · FONALA" };

async function Conteudo({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AnexosExames pacienteId={id} />;
}

export default function AnexosPage({ params }: PageProps<"/pacientes/[id]/anexos">) {
  return (
    <Suspense>
      <Conteudo params={params} />
    </Suspense>
  );
}
