import { EsqueciSenhaForm } from "@/components/EsqueciSenhaForm";
import { TelaAcesso } from "@/components/TelaAcesso";

export const metadata = { title: "Esqueci minha senha · FONALA" };

export default function EsqueciSenhaPage() {
  return (
    <TelaAcesso
      titulo="Esqueceu a senha?"
      subtitulo="Informe seu e-mail e enviaremos um link para criar uma nova senha"
    >
      <EsqueciSenhaForm />
    </TelaAcesso>
  );
}
