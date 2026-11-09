import { redirect } from "next/navigation";

/** A página inicial é a lista de pacientes; o cadastro fica em /pacientes/novo. */
export default function Inicio() {
  redirect("/pacientes");
}
