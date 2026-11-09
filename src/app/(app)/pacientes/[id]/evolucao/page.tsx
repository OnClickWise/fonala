import { Suspense } from "react";
import { EvolucaoClinica } from "@/components/EvolucaoClinica";

export const metadata = { title: "Evolução · FONALA" };

async function Conteudo({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <EvolucaoClinica pacienteId={id} />;
}

export default function EvolucaoPage({ params }: PageProps<"/pacientes/[id]/evolucao">) {
  return (
    <Suspense>
      <Conteudo params={params} />
    </Suspense>
  );
}
