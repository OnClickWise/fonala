import { Suspense } from "react";
import { PlanoTerapeutico } from "@/components/PlanoTerapeutico";

export const metadata = { title: "Plano Terapêutico · FONALA" };

async function Conteudo({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PlanoTerapeutico pacienteId={id} />;
}

export default function PlanoPage({ params }: PageProps<"/pacientes/[id]/plano">) {
  return (
    <Suspense>
      <Conteudo params={params} />
    </Suspense>
  );
}
