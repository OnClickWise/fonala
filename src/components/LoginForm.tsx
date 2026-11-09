"use client";

import { CircleCheck, Loader2, LogIn, Mail, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { api } from "@/lib/api";
import { salvarSessao, useSessao } from "@/lib/sessao";
import { useParametro } from "@/lib/url";
import { CampoSenha } from "./CampoSenha";
import { estiloAlerta, estiloBotaoPrincipal } from "./TelaAcesso";
import { Campo, estiloInput } from "./ui";

export function LoginForm() {
  const router = useRouter();
  const emailDaUrl = useParametro("email");
  const expirou = useParametro("expirou") === "1";
  const redefinida = useParametro("redefinida") === "1";
  const [emailDigitado, setEmail] = useState<string | null>(null);
  const email = emailDigitado ?? emailDaUrl ?? "";
  const [senha, setSenha] = useState("");
  const [erroForm, setErro] = useState("");
  const [entrando, setEntrando] = useState(false);
  const { sessao } = useSessao();

  const erro = erroForm || (expirou && emailDigitado === null ? "Sua sessão expirou. Entre novamente." : "");
  const sucesso = !erro && redefinida ? "Senha alterada! Entre com a nova senha." : "";

  // já logado (ou acabou de logar): vai para a lista de pacientes
  useEffect(() => {
    if (sessao) router.replace("/pacientes");
  }, [sessao, router]);

  async function entrar(ev: FormEvent) {
    ev.preventDefault();
    if (!email.trim() || !senha) {
      setErro("Informe e-mail e senha.");
      return;
    }
    setErro("");
    setEntrando(true);
    try {
      salvarSessao(await api.login(email.trim(), senha));
    } catch (e) {
      setErro((e as Error).message);
      setEntrando(false);
    }
  }

  const linkEsqueci = `/esqueci-senha${email.trim() ? `?email=${encodeURIComponent(email.trim())}` : ""}`;

  return (
    <form onSubmit={entrar} noValidate className="space-y-5">
      <Campo rotulo="E-mail:" icone={Mail}>
        <input
          type="email"
          className={estiloInput}
          placeholder="seu@email.com"
          autoComplete="username"
          autoFocus={!emailDaUrl}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </Campo>

      <div>
        <CampoSenha
          rotulo="Senha:"
          placeholder="Digite sua senha..."
          autoComplete="current-password"
          autoFocus={Boolean(emailDaUrl)}
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
        />
        <p className="mt-2 text-right">
          <Link
            href={linkEsqueci}
            className="text-sm font-bold text-teal-600 underline-offset-4 transition hover:text-teal-800 hover:underline"
          >
            Esqueci minha senha
          </Link>
        </p>
      </div>

      {erro && (
        <p role="alert" className={estiloAlerta.erro}>
          <TriangleAlert className="size-4 shrink-0" />
          {erro}
        </p>
      )}
      {sucesso && (
        <p role="status" className={estiloAlerta.ok}>
          <CircleCheck className="size-4 shrink-0" />
          {sucesso}
        </p>
      )}

      <button type="submit" disabled={entrando} className={estiloBotaoPrincipal}>
        {entrando ? <Loader2 className="size-5 animate-spin" /> : <LogIn className="size-5" />}
        Entrar
      </button>
    </form>
  );
}
