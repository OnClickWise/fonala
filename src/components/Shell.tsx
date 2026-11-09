import Image from "next/image";
import Link from "next/link";
import { Heart } from "lucide-react";
import type { ReactNode } from "react";
import { MenuUsuario } from "./MenuUsuario";

function Bolha({ className }: { className: string }) {
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute grid place-items-center rounded-full print:!hidden bg-[radial-gradient(circle_at_30%_30%,#5fb3a2,#2f7366_70%)] shadow-[0_18px_40px_-12px_rgba(36,92,82,.55)] animate-flutuar ${className}`}
    >
      <Heart className="h-1/2 w-1/2 fill-white text-white drop-shadow" />
    </div>
  );
}

export function Shell({
  titulo,
  acoes,
  children,
}: {
  titulo: string;
  acoes?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <Bolha className="-right-12 top-4 hidden size-36 2xl:grid" />
      <Bolha className="-left-10 top-1/3 hidden size-24 [animation-delay:1.5s] md:grid" />
      <Bolha className="-bottom-8 right-10 hidden size-28 [animation-delay:3s] md:grid" />

      <div className="relative mx-auto max-w-6xl px-4 py-6 sm:px-8 sm:py-8">
        <header className="relative z-10 mb-8 flex flex-wrap items-center gap-x-8 gap-y-4">
          <Link href="/pacientes" className="shrink-0" aria-label="FONALA - início">
            <Image src="/logo-teal.png" alt="FONALA Audiologia e Fonoterapia" width={935} height={261} priority className="h-14 w-auto sm:h-16" />
          </Link>
          <div className="hidden h-14 w-px bg-teal-500/30 sm:block" />
          <h1 className="relative font-script text-4xl text-coral sm:text-5xl">
            {titulo}
            <svg viewBox="0 0 300 20" className="absolute -bottom-3 left-1/4 w-3/4 text-teal-500" aria-hidden>
              <path d="M2 14 C 90 2, 200 2, 298 10" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            </svg>
          </h1>
          <div className="ml-auto flex flex-wrap items-center gap-3 print:hidden">
            {acoes}
            <MenuUsuario />
          </div>
        </header>
        {children}
      </div>
    </div>
  );
}
