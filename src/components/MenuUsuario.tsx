"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { limparSessao } from "@/lib/sessao";
import { useUsuario } from "./AuthGate";

export function MenuUsuario() {
  const usuario = useUsuario();
  const router = useRouter();
  if (!usuario) return null;

  function sair() {
    limparSessao();
    router.replace("/login");
  }

  return (
    <div className="flex items-center gap-1 rounded-full bg-white/70 py-1 pl-1 pr-1 shadow-sm ring-1 ring-teal-200">
      <span className="grid size-8 place-items-center rounded-full bg-gradient-to-br from-teal-500 to-teal-600 text-sm font-extrabold text-white">
        {usuario.nome.charAt(0).toUpperCase()}
      </span>
      <span className="hidden max-w-32 truncate px-2 text-sm font-bold text-teal-700 sm:block" title={usuario.email}>
        {usuario.nome}
      </span>
      <button
        onClick={sair}
        title="Sair"
        aria-label="Sair"
        className="grid size-8 place-items-center rounded-full text-teal-600 transition hover:bg-coral hover:text-white"
      >
        <LogOut className="size-4" />
      </button>
    </div>
  );
}
