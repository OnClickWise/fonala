import { LoginForm } from "@/components/LoginForm";
import { TelaAcesso } from "@/components/TelaAcesso";

export const metadata = { title: "Entrar · FONALA" };

export default function LoginPage() {
  return (
    <TelaAcesso titulo="Bem-vindo(a)!" subtitulo="Acesse sua conta para continuar">
      <LoginForm />
    </TelaAcesso>
  );
}
