"use client";

import { ArrowLeft, Check, KeyRound, Link2Off, Loader2, Mail, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { api } from "@/lib/api";
import { limparSessao } from "@/lib/sessao";
import { useParametro } from "@/lib/url";
import { CampoSenha } from "./CampoSenha";
import { linkVoltarLogin } from "./EsqueciSenhaForm";
import { estiloAlerta, estiloBotaoPrincipal } from "./TelaAcesso";
import { Campo, estiloInput } from "./ui";

const LINK_INVALIDO = "Link inválido ou expirado. Solicite uma nova redefinição de senha.";

/** Mesma regra do backend: 8 a 72 caracteres, letras e números. */
function regras(senha: string, confirmacao: string) {
  return [
    { texto: "Pelo menos 8 caracteres", ok: senha.length >= 8 && senha.length <= 72 },
    { texto: "Letras e números", ok: /[A-Za-z]/.test(senha) && /\d/.test(senha) },
    { texto: "As duas senhas são iguais", ok: senha.length > 0 && senha === confirmacao },
  ];
}

type Verificacao = { token: string; email?: string; erro?: string };

export function NovaSenhaForm() {
  const router = useRouter();
  const token = useParametro("token");
  const [verificacao, setVerificacao] = useState<Verificacao | null>(null);
  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [tentou, setTentou] = useState(false);
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!token) return;
    let ativo = true;
    api
      .verificarToken(token)
      .then(({ email }) => ativo && setVerificacao({ token, email }))
      .catch((e: Error) => ativo && setVerificacao({ token, erro: e.message }));
    return () => {
      ativo = false;
    };
  }, [token]);

  // estado derivado: sem token na URL o link já é inválido
  const atual = verificacao?.token === token ? verificacao : null;
  const invalido = token === "" ? LINK_INVALIDO : atual?.erro;
  const lista = regras(senha, confirmacao);

  async function salvar(ev: FormEvent) {
    ev.preventDefault();
    setTentou(true);
    if (!token || lista.some((r) => !r.ok)) {
      setErro(lista.find((r) => !r.ok) ? "A nova senha não atende aos requisitos." : "");
      return;
    }
    setErro("");
    setSalvando(true);
    try {
      await api.redefinirSenha(token, senha);
      limparSessao();
      router.replace(`/login?redefinida=1&email=${encodeURIComponent(atual?.email ?? "")}`);
    } catch (e) {
      setErro((e as Error).message);
      setSalvando(false);
    }
  }

  if (invalido)
    return (
      <div className="animate-surgir space-y-6 text-center">
        <span className="mx-auto grid size-20 place-items-center rounded-full bg-coral/10 text-coral">
          <Link2Off className="size-10" strokeWidth={1.6} />
        </span>
        <div className="space-y-2">
          <p className="text-lg font-extrabold text-teal-800">Não foi possível usar este link</p>
          <p className="text-sm font-semibold text-teal-700/80">{invalido}</p>
        </div>
        <Link href="/esqueci-senha" className={estiloBotaoPrincipal}>
          <Mail className="size-5" />
          Pedir um novo link
        </Link>
        <Link href="/login" className={linkVoltarLogin}>
          <ArrowLeft className="size-4" />
          Voltar para o login
        </Link>
      </div>
    );

  if (!atual?.email)
    return (
      <p className="flex items-center justify-center gap-3 py-10 font-bold text-teal-700/70" role="status">
        <Loader2 className="size-5 animate-spin" />
        Verificando o link...
      </p>
    );

  return (
    <form onSubmit={salvar} noValidate className="space-y-5">
      <Campo rotulo="Conta:" icone={Mail}>
        <input
          className={`${estiloInput} text-teal-800/70`}
          value={atual.email}
          autoComplete="username"
          readOnly
          tabIndex={-1}
        />
      </Campo>

      <CampoSenha
        rotulo="Nova senha:"
        placeholder="Crie uma nova senha..."
        autoComplete="new-password"
        autoFocus
        maxLength={72}
        value={senha}
        onChange={(e) => setSenha(e.target.value)}
        erro={tentou && !(lista[0].ok && lista[1].ok) ? " " : undefined}
      />
      <CampoSenha
        rotulo="Confirme a nova senha:"
        placeholder="Digite a senha novamente..."
        autoComplete="new-password"
        maxLength={72}
        value={confirmacao}
        onChange={(e) => setConfirmacao(e.target.value)}
        erro={tentou && !lista[2].ok ? " " : undefined}
      />

      <ul className="grid gap-1.5 rounded-2xl bg-teal-50/70 px-4 py-3" aria-label="Requisitos da senha">
        {lista.map((r) => (
          <li
            key={r.texto}
            className={`flex items-center gap-2 text-sm font-bold transition ${
              r.ok ? "text-teal-600" : tentou ? "text-coral" : "text-teal-700/50"
            }`}
          >
            <span
              className={`grid size-5 place-items-center rounded-full transition ${
                r.ok ? "bg-teal-500 text-white" : "border-2 border-current"
              }`}
            >
              {r.ok && <Check className="size-3.5" strokeWidth={3} />}
            </span>
            {r.texto}
          </li>
        ))}
      </ul>

      {erro && (
        <p role="alert" className={estiloAlerta.erro}>
          <TriangleAlert className="size-4 shrink-0" />
          {erro}
        </p>
      )}

      <button type="submit" disabled={salvando} className={estiloBotaoPrincipal}>
        {salvando ? <Loader2 className="size-5 animate-spin" /> : <KeyRound className="size-5" />}
        Salvar nova senha
      </button>

      <Link href="/login" className={linkVoltarLogin}>
        <ArrowLeft className="size-4" />
        Voltar para o login
      </Link>
    </form>
  );
}
