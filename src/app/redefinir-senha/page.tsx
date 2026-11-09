import type { Metadata } from "next";
import { NovaSenhaForm } from "@/components/NovaSenhaForm";
import { TelaAcesso } from "@/components/TelaAcesso";

export const metadata: Metadata = {
  title: "Nova senha · FONALA",
  // o token vai na URL: não repassá-lo para outros sites
  referrer: "no-referrer",
};

export default function RedefinirSenhaPage() {
  return (
    <TelaAcesso titulo="Nova senha" subtitulo="Crie uma nova senha para acessar sua conta">
      <NovaSenhaForm />
    </TelaAcesso>
  );
}
