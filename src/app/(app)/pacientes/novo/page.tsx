import { CadastroPaciente } from "@/components/CadastroPaciente";
import { LinkPacientes } from "@/components/LinkPacientes";
import { Shell } from "@/components/Shell";

export const metadata = { title: "Novo paciente · FONALA" };

export default function NovoPacientePage() {
  return (
    <Shell titulo="Cadastro de Paciente" acoes={<LinkPacientes />}>
      <CadastroPaciente />
    </Shell>
  );
}
