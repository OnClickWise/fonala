import Image from "next/image";
import { Check } from "lucide-react";
import type { ReactNode } from "react";

const SERVICOS = ["Audiologia clínica", "Fonoterapia", "Terapia de zumbido"];

/** Moldura das telas públicas (login, esqueci a senha, nova senha). */
export function TelaAcesso({
  titulo,
  subtitulo,
  children,
}: {
  titulo: string;
  subtitulo: string;
  children: ReactNode;
}) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <div className="animate-surgir grid w-full max-w-4xl overflow-hidden rounded-[2rem] border border-teal-200 bg-white/80 shadow-[0_30px_70px_-30px_rgba(36,92,82,.5)] backdrop-blur md:grid-cols-[1fr_1.1fr]">
        {/* Painel da marca */}
        <section className="relative hidden flex-col items-center justify-center gap-8 overflow-hidden bg-gradient-to-br from-blush-100 via-blush-200 to-blush-300 p-10 md:flex">
          <div aria-hidden className="absolute -left-16 -top-16 size-56 rounded-full bg-white/30" />
          <div aria-hidden className="absolute -bottom-20 -right-10 size-64 rounded-full bg-teal-500/10" />
          <Image
            src="/selo.png"
            alt="FONALA · Audiologia e Fonoterapia"
            width={676}
            height={739}
            priority
            className="animate-flutuar relative w-60 drop-shadow-[0_20px_30px_rgba(36,92,82,.35)]"
          />
          <div className="relative text-center">
            <p className="font-script text-3xl text-coral">Cuidando de ouvir e falar</p>
            <ul className="mt-5 space-y-2 text-left">
              {SERVICOS.map((s) => (
                <li key={s} className="flex items-center gap-3 font-bold text-teal-700">
                  <span className="grid size-6 place-items-center rounded-full bg-teal-500 text-white">
                    <Check className="size-4" strokeWidth={3} />
                  </span>
                  {s}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Conteúdo */}
        <section className="flex min-w-0 flex-col justify-center px-6 py-10 sm:px-12">
          <Image
            src="/logo-teal.png"
            alt="FONALA Audiologia e Fonoterapia"
            width={935}
            height={261}
            priority
            className="mx-auto h-16 w-auto"
          />
          <h1 className="mt-8 text-center font-script text-4xl text-coral">{titulo}</h1>
          <p className="mb-8 mt-1 text-center text-sm font-semibold text-teal-700/70">{subtitulo}</p>
          {children}
        </section>
      </div>
      <p className="mt-6 text-xs font-semibold text-teal-700/60">
        © {2026} FONALA · Audiologia e Fonoterapia
      </p>
    </main>
  );
}

/** Mensagem de erro/sucesso usada nos formulários de acesso. */
export const estiloAlerta = {
  erro: "animate-surgir flex items-center gap-2 rounded-2xl bg-coral/10 px-4 py-2.5 text-sm font-bold text-coral",
  ok: "animate-surgir flex items-center gap-2 rounded-2xl bg-teal-50 px-4 py-2.5 text-sm font-bold text-teal-700",
};

export const estiloBotaoPrincipal =
  "flex w-full items-center justify-center gap-3 rounded-full bg-gradient-to-r from-teal-600 to-teal-500 py-3.5 text-lg font-bold text-white shadow-[0_12px_28px_-10px_rgba(36,92,82,.7)] transition hover:brightness-110 active:scale-[.98] disabled:opacity-60";
