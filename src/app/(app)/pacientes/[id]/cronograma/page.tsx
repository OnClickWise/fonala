import { Suspense } from "react";
import { CronogramaSessoes } from "@/components/CronogramaSessoes";

export const metadata = { title: "Cronograma de Sessões · FONALA" };

async function Conteudo({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CronogramaSessoes pacienteId={id} />;
}

export default function CronogramaPage({ params }: PageProps<"/pacientes/[id]/cronograma">) {
  return (
    <Suspense>
      <Conteudo params={params} />
    </Suspense>
  );
}
