"use client";

import { Eye, EyeOff, LockKeyhole } from "lucide-react";
import { useState, type InputHTMLAttributes } from "react";
import { Campo, estiloInput } from "./ui";

/** Campo de senha com botão de mostrar/ocultar. */
export function CampoSenha({
  rotulo,
  erro,
  ...input
}: { rotulo: string; erro?: string } & Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "className">) {
  const [ver, setVer] = useState(false);
  return (
    <Campo rotulo={rotulo} icone={LockKeyhole} erro={erro}>
      <input type={ver ? "text" : "password"} className={estiloInput} {...input} />
      <button
        type="button"
        onClick={() => setVer((v) => !v)}
        aria-label={ver ? "Ocultar senha" : "Mostrar senha"}
        className="grid w-12 shrink-0 place-items-center text-teal-500 transition hover:text-teal-700"
      >
        {ver ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
      </button>
    </Campo>
  );
}
