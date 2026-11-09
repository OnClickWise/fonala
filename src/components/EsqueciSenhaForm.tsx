"use client";

import { ArrowLeft, Loader2, Mail, MailCheck, Send, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { api } from "@/lib/api";
import { useParametro } from "@/lib/url";
import { estiloAlerta, estiloBotaoPrincipal } from "./TelaAcesso";
import { Campo, estiloInput } from "./ui";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const linkVoltarLogin =
  "flex items-center justify-center gap-2 text-sm font-bold text-teal-600 transition hover:text-teal-800";

export function EsqueciSenhaForm() {
  const emailDaUrl = useParametro("email");
  const [emailDigitado, setEmail] = useState<string | null>(null);
  const email = emailDigitado ?? emailDaUrl ?? "";
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [enviadoPara, setEnviadoPara] = useState("");

  async function enviar(ev: FormEvent) {
    ev.preventDefault();
    const valor = email.trim();
    if (!EMAIL.test(valor)) {
      setErro("Informe um e-mail válido.");
      return;
    }
    setErro("");
    setEnviando(true);
    try {
      await api.esqueciSenha(valor);
      setEnviadoPara(valor);
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setEnviando(false);
    }
  }

  if (enviadoPara)
    return (
      <div className="animate-surgir space-y-6 text-center">
        <span className="mx-auto grid size-20 place-items-center rounded-full bg-gradient-to-br from-teal-100 to-teal-200 text-teal-700 shadow-inner">
          <MailCheck className="size-10" strokeWidth={1.6} />
        </span>
        <div className="space-y-2 text-teal-800">
          <p className="text-lg font-extrabold">Verifique seu e-mail</p>
          <p className="text-sm font-semibold text-teal-700/80">
            Se <strong className="break-all text-teal-800">{enviadoPara}</strong> estiver cadastrado, você receberá um
            link para criar uma nova senha. O link vale por <strong>30 minutos</strong>.
          </p>
          <p className="text-xs font-semibold text-teal-700/60">
            Não chegou? Confira a caixa de spam ou tente novamente em 1 minuto.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setEnviadoPara("")}
          className="w-full rounded-full border-2 border-teal-600 bg-white/80 py-3 font-bold text-teal-700 transition hover:bg-white active:scale-[.98]"
        >
          Usar outro e-mail
        </button>
        <Link href="/login" className={linkVoltarLogin}>
          <ArrowLeft className="size-4" />
          Voltar para o login
        </Link>
      </div>
    );

  return (
    <form onSubmit={enviar} noValidate className="space-y-5">
      <Campo rotulo="E-mail:" icone={Mail}>
        <input
          type="email"
          className={estiloInput}
          placeholder="seu@email.com"
          autoComplete="email"
          autoFocus
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </Campo>

      {erro && (
        <p role="alert" className={estiloAlerta.erro}>
          <TriangleAlert className="size-4 shrink-0" />
          {erro}
        </p>
      )}

      <button type="submit" disabled={enviando} className={estiloBotaoPrincipal}>
        {enviando ? <Loader2 className="size-5 animate-spin" /> : <Send className="size-5" />}
        Enviar link
      </button>

      <Link href="/login" className={linkVoltarLogin}>
        <ArrowLeft className="size-4" />
        Voltar para o login
      </Link>
    </form>
  );
}
