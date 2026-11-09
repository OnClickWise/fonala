import Link from "next/link";
import { UserPlus } from "lucide-react";
import { ListaPacientes } from "@/components/ListaPacientes";
import { Shell } from "@/components/Shell";

export const metadata = { title: "Pacientes · FONALA" };

export default function PacientesPage() {
  return (
    <Shell
      titulo="Pacientes"
      acoes={
        <Link
          href="/pacientes/novo"
          className="flex items-center gap-2 rounded-full bg-gradient-to-r from-teal-600 to-teal-500 px-5 py-2.5 text-sm font-bold text-white shadow-md transition hover:brightness-110"
        >
          <UserPlus className="size-4" />
          Novo paciente
        </Link>
      }
    >
      <ListaPacientes />
    </Shell>
  );
}
