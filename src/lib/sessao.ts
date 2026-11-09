import { useMemo, useSyncExternalStore } from "react";

export interface Usuario {
  id: string;
  nome: string;
  email: string;
}

export interface Sessao {
  token: string;
  usuario: Usuario;
}

const CHAVE = "fonala.sessao";
const EVENTO = "fonala:sessao";

function lerBruto(): string | null {
  try {
    return localStorage.getItem(CHAVE);
  } catch {
    return null;
  }
}

function interpretar(bruto: string | null): Sessao | null {
  if (!bruto) return null;
  try {
    const sessao = JSON.parse(bruto) as Sessao;
    // ignora token já expirado (exp em segundos no payload do JWT)
    const { exp } = JSON.parse(atob(sessao.token.split(".")[1]));
    if (typeof exp === "number" && exp * 1000 < Date.now()) return null;
    return sessao;
  } catch {
    return null;
  }
}

export const lerSessao = () => interpretar(lerBruto());

function avisar() {
  window.dispatchEvent(new Event(EVENTO));
}

export function salvarSessao(sessao: Sessao) {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(sessao));
  } catch {
    /* armazenamento indisponível */
  }
  avisar();
}

export function limparSessao() {
  try {
    localStorage.removeItem(CHAVE);
  } catch {
    /* armazenamento indisponível */
  }
  avisar();
}

function assinar(cb: () => void) {
  window.addEventListener("storage", cb);
  window.addEventListener(EVENTO, cb);
  return () => {
    window.removeEventListener("storage", cb);
    window.removeEventListener(EVENTO, cb);
  };
}

/** Sessão atual; `pronto` é false durante a renderização no servidor. */
export function useSessao() {
  const bruto = useSyncExternalStore(assinar, lerBruto, () => undefined);
  const sessao = useMemo(() => (bruto === undefined ? null : interpretar(bruto)), [bruto]);
  return { pronto: bruto !== undefined, sessao };
}
