import { Suspense } from "react";
import { DocumentosClinicos } from "@/components/DocumentosClinicos";

export const metadata = { title: "Documentos · FONALA" };

async function Conteudo({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <DocumentosClinicos pacienteId={id} />;
}

export default function DocumentosPage({ params }: PageProps<"/pacientes/[id]/documentos">) {
  return (
    <Suspense>
      <Conteudo params={params} />
    </Suspense>
  );
}
