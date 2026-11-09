import { Suspense } from "react";
import { AvaliacaoForm } from "@/components/AvaliacaoForm";

export const metadata = { title: "Avaliação · FONALA" };

async function Conteudo({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AvaliacaoForm pacienteId={id} />;
}

export default function AvaliacaoPage({ params }: PageProps<"/pacientes/[id]/avaliacao">) {
  return (
    <Suspense>
      <Conteudo params={params} />
    </Suspense>
  );
}
