"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { createContext, useContext, useEffect, type ReactNode } from "react";
import { useSessao, type Usuario } from "@/lib/sessao";

const UsuarioContext = createContext<Usuario | null>(null);
export const useUsuario = () => useContext(UsuarioContext);

/** Só renderiza o conteúdo se houver sessão válida; senão manda para /login. */
export function AuthGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { pronto, sessao } = useSessao();

  useEffect(() => {
    if (pronto && !sessao) router.replace("/login");
  }, [pronto, sessao, router]);

  if (!sessao)
    return (
      <div className="grid min-h-screen place-items-center text-teal-500">
        <Loader2 className="size-8 animate-spin" />
      </div>
    );

  return <UsuarioContext.Provider value={sessao.usuario}>{children}</UsuarioContext.Provider>;
}
