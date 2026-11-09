import { Suspense } from "react";
import { AnamneseForm } from "@/components/AnamneseForm";

export const metadata = { title: "Anamnese · FONALA" };

async function Conteudo({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AnamneseForm pacienteId={id} />;
}

export default function AnamnesePage({ params }: PageProps<"/pacientes/[id]/anamnese">) {
  return (
    <Suspense>
      <Conteudo params={params} />
    </Suspense>
  );
}
