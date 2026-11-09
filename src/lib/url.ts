"use client";

import { useSyncExternalStore } from "react";

const semAssinatura = () => () => {};

/**
 * Lê um parâmetro da URL atual sem precisar de Suspense.
 * Retorna `null` durante a renderização no servidor e "" quando o parâmetro não existe.
 */
export function useParametro(nome: string): string | null {
  return useSyncExternalStore(
    semAssinatura,
    () => new URLSearchParams(window.location.search).get(nome) ?? "",
    () => null,
  );
}
