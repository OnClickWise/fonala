import Link from "next/link";
import { ListChecks } from "lucide-react";

export function LinkPacientes() {
  return (
    <Link
      href="/pacientes"
      className="flex items-center gap-2 rounded-full bg-white/70 px-5 py-2.5 text-sm font-bold text-teal-700 shadow-sm ring-1 ring-teal-200 transition hover:bg-white"
    >
      <ListChecks className="size-4" />
      Pacientes
    </Link>
  );
}
