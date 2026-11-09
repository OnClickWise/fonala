import { Suspense } from "react";
import { AudiometriaFonala } from "@/components/AudiometriaFonala";

export const metadata = { title: "Audiometria · FONALA" };

async function Conteudo({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AudiometriaFonala pacienteId={id} />;
}

export default function AudiometriaPage({ params }: PageProps<"/pacientes/[id]/audiometria">) {
  return (
    <Suspense>
      <Conteudo params={params} />
    </Suspense>
  );
}
