"use client";

import {
  CakeSlice,
  CalendarDays,
  CircleCheck,
  ClipboardList,
  IdCard,
  Loader2,
  MessageSquareText,
  Phone,
  RotateCw,
  Save,
  User,
  Users,
  VenusAndMars,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useImperativeHandle, useState, type FormEvent, type Ref } from "react";
import { api, SEXOS, type Paciente, type PacienteInput, type Sexo } from "@/lib/api";
import {
  calcularIdade,
  cpfValido,
  dataParaIso,
  digitos,
  isoParaData,
  mascaraCpf,
  mascaraData,
  mascaraTelefone,
} from "@/lib/format";
import { Campo, estiloInput, Secao, Toast, type Aviso } from "./ui";

type Form = {
  nomeCompleto: string;
  cpf: string;
  dataNascimento: string;
  sexo: Sexo | "";
  queixa: string;
  responsavelNome: string;
  responsavelCpf: string;
  responsavelTelefone: string;
};
type Erros = Partial<Record<keyof Form, string>>;

const VAZIO: Form = {
  nomeCompleto: "",
  cpf: "",
  dataNascimento: "",
  sexo: "",
  queixa: "",
  responsavelNome: "",
  responsavelCpf: "",
  responsavelTelefone: "",
};

const dePaciente = (p: Paciente): Form => ({
  nomeCompleto: p.nomeCompleto,
  cpf: mascaraCpf(p.cpf),
  dataNascimento: isoParaData(p.dataNascimento),
  sexo: p.sexo,
  queixa: p.queixa ?? "",
  responsavelNome: p.responsavelNome ?? "",
  responsavelCpf: mascaraCpf(p.responsavelCpf ?? ""),
  responsavelTelefone: mascaraTelefone(p.responsavelTelefone ?? ""),
});

function validar(f: Form): Erros {
  const e: Erros = {};
  if (!f.nomeCompleto.trim()) e.nomeCompleto = "Informe o nome do paciente";
  if (!cpfValido(f.cpf)) e.cpf = "CPF inválido";
  const iso = dataParaIso(f.dataNascimento);
  if (!iso) e.dataNascimento = "Data inválida";
  else if (new Date(iso) > new Date()) e.dataNascimento = "Data no futuro";
  if (!f.sexo) e.sexo = "Selecione o sexo";
  if (f.responsavelCpf && !cpfValido(f.responsavelCpf)) e.responsavelCpf = "CPF inválido";
  const tel = digitos(f.responsavelTelefone);
  if (tel && (tel.length < 10 || tel.length > 11)) e.responsavelTelefone = "Telefone inválido";
  return e;
}

export interface PacienteFormHandle {
  abrirModulo(rota: string, titulo: string): Promise<void>;
}

export function PacienteForm({ id, ref }: { id?: string; ref?: Ref<PacienteFormHandle> }) {
  const router = useRouter();
  const [form, setForm] = useState<Form>(VAZIO);
  const [erros, setErros] = useState<Erros>({});
  const [salvando, setSalvando] = useState(false);
  const [carregando, setCarregando] = useState(Boolean(id));
  const [aviso, setAviso] = useState<Aviso>(null);
  const [recente, setRecente] = useState<{ id: string; nome: string } | null>(null);
  const fecharAviso = useCallback(() => setAviso(null), []);

  useEffect(() => {
    if (!id) return;
    api
      .obter(id)
      .then((p) => setForm(dePaciente(p)))
      .catch((e: Error) => setAviso({ tipo: "erro", texto: e.message }))
      .finally(() => setCarregando(false));
  }, [id]);

  const set =
    <K extends keyof Form>(campo: K, mascara?: (v: string) => string) =>
    (ev: { target: { value: string } }) => {
      const valor = mascara ? mascara(ev.target.value) : ev.target.value;
      setForm((f) => ({ ...f, [campo]: valor }));
      if (erros[campo]) setErros((e) => ({ ...e, [campo]: undefined }));
    };

  const idade = calcularIdade(dataParaIso(form.dataNascimento));

  function limpar() {
    setForm(VAZIO);
    setErros({});
  }

  async function salvar(ev: FormEvent) {
    ev.preventDefault();
    await gravar();
  }

  /** Valida e salva; retorna o id do paciente criado (ou null). */
  async function gravar(mensagemErro = "Verifique os campos destacados."): Promise<string | null> {
    const e = validar(form);
    setErros(e);
    if (Object.keys(e).length) {
      setAviso({ tipo: "erro", texto: mensagemErro });
      return null;
    }

    const dados: PacienteInput = {
      nomeCompleto: form.nomeCompleto.trim(),
      cpf: digitos(form.cpf),
      dataNascimento: dataParaIso(form.dataNascimento)!,
      sexo: form.sexo as Sexo,
      queixa: form.queixa.trim() || null,
      responsavelNome: form.responsavelNome.trim() || null,
      responsavelCpf: digitos(form.responsavelCpf) || null,
      responsavelTelefone: digitos(form.responsavelTelefone) || null,
    };

    setSalvando(true);
    try {
      if (id) {
        await api.atualizar(id, dados);
        setAviso({ tipo: "ok", texto: "Cadastro atualizado com sucesso!" });
        setTimeout(() => router.push("/pacientes"), 900);
        return id;
      }
      const novo = await api.criar(dados);
      setAviso({ tipo: "ok", texto: "Paciente cadastrado com sucesso!" });
      setRecente({ id: novo.id, nome: novo.nomeCompleto });
      limpar();
      return novo.id;
    } catch (err) {
      setAviso({ tipo: "erro", texto: (err as Error).message });
      return null;
    } finally {
      setSalvando(false);
    }
  }

  /**
   * Atalho dos módulos (Anamnese, Avaliação) na tela de novo cadastro:
   * salva o paciente digitado e abre o módulo dele; com o formulário vazio,
   * usa o paciente que acabou de ser cadastrado.
   */
  useImperativeHandle(ref, () => ({
    async abrirModulo(rota: string, titulo: string) {
      const vazio = JSON.stringify(form) === JSON.stringify(VAZIO);
      if (vazio && recente) {
        router.push(`/pacientes/${recente.id}/${rota}`);
        return;
      }
      const novoId = await gravar(
        vazio ? `Preencha o cadastro do paciente para abrir o módulo ${titulo}.` : undefined,
      );
      if (novoId) router.push(`/pacientes/${novoId}/${rota}`);
    },
  }));

  return (
    <form onSubmit={salvar} noValidate className="min-w-0">
      <fieldset
        disabled={carregando}
        className="min-w-0 overflow-hidden rounded-3xl border border-teal-200 bg-white/75 shadow-[0_20px_50px_-25px_rgba(36,92,82,.45)] backdrop-blur-sm"
      >
        <Secao icone={User} titulo="Dados do Paciente">
          <Campo rotulo="Nome Completo:" icone={User} erro={erros.nomeCompleto} largo>
            <input className={estiloInput} placeholder="Digite o nome do paciente..." value={form.nomeCompleto} onChange={set("nomeCompleto")} maxLength={150} autoComplete="off" />
          </Campo>
          <Campo rotulo="CPF:" icone={IdCard} erro={erros.cpf}>
            <input className={estiloInput} placeholder="Digite o CPF..." inputMode="numeric" value={form.cpf} onChange={set("cpf", mascaraCpf)} />
          </Campo>
          <Campo rotulo="Data de Nascimento:" icone={CalendarDays} erro={erros.dataNascimento}>
            <input className={estiloInput} placeholder="DD/MM/AAAA" inputMode="numeric" value={form.dataNascimento} onChange={set("dataNascimento", mascaraData)} />
          </Campo>
          <Campo rotulo="Idade:" icone={CakeSlice}>
            <input className={estiloInput} value={idade || "--"} disabled readOnly tabIndex={-1} />
          </Campo>
          <Campo rotulo="Sexo:" icone={VenusAndMars} erro={erros.sexo}>
            <select className={`${estiloInput} cursor-pointer ${form.sexo ? "" : "text-teal-800/40"}`} value={form.sexo} onChange={set("sexo")}>
              <option value="" disabled>Selecione...</option>
              {SEXOS.map((s) => (
                <option key={s.valor} value={s.valor} className="text-teal-800">{s.rotulo}</option>
              ))}
            </select>
          </Campo>
          <Campo rotulo="Queixa:" icone={MessageSquareText} largo>
            <textarea className={`${estiloInput} min-h-20 resize-y`} placeholder="Descreva a queixa principal..." value={form.queixa} onChange={set("queixa")} maxLength={2000} />
          </Campo>
        </Secao>

        <Secao icone={Users} titulo="Responsável">
          <Campo rotulo="Nome do Responsável:" icone={User} largo>
            <input className={estiloInput} placeholder="Digite o nome do responsável..." value={form.responsavelNome} onChange={set("responsavelNome")} maxLength={150} autoComplete="off" />
          </Campo>
          <Campo rotulo="CPF do Responsável:" icone={IdCard} erro={erros.responsavelCpf}>
            <input className={estiloInput} placeholder="Digite o CPF..." inputMode="numeric" value={form.responsavelCpf} onChange={set("responsavelCpf", mascaraCpf)} />
          </Campo>
          <Campo rotulo="Telefone do Responsável:" icone={Phone} erro={erros.responsavelTelefone}>
            <input className={estiloInput} placeholder="(11) 98765-4321" inputMode="tel" value={form.responsavelTelefone} onChange={set("responsavelTelefone", mascaraTelefone)} />
          </Campo>
        </Secao>
      </fieldset>

      <div className="mt-6 flex flex-col-reverse justify-center gap-4 sm:flex-row">
        <button
          type="button"
          onClick={id ? () => router.push("/pacientes") : limpar}
          className="flex items-center justify-center gap-3 rounded-full border-2 border-teal-600 bg-white/80 px-10 py-3 text-lg font-bold text-teal-700 transition hover:bg-white active:scale-[.98]"
        >
          <RotateCw className="size-5" />
          {id ? "Cancelar" : "Limpar"}
        </button>
        <button
          type="submit"
          disabled={salvando || carregando}
          className="flex items-center justify-center gap-3 rounded-full bg-gradient-to-r from-teal-600 to-teal-500 px-10 py-3 text-lg font-bold text-white shadow-[0_12px_28px_-10px_rgba(36,92,82,.7)] transition hover:brightness-110 active:scale-[.98] disabled:opacity-60"
        >
          {salvando ? <Loader2 className="size-5 animate-spin" /> : <Save className="size-5" />}
          {id ? "Salvar Alterações" : "Salvar Cadastro"}
        </button>
      </div>

      {recente && (
        <div className="animate-surgir mt-6 flex flex-wrap items-center gap-4 rounded-3xl border border-teal-300 bg-teal-50/90 px-5 py-4">
          <CircleCheck className="size-6 shrink-0 text-teal-500" />
          <p className="flex-1 text-sm font-semibold text-teal-800">
            <strong>{recente.nome}</strong> foi cadastrado(a). Deseja preencher a anamnese agora?
          </p>
          <Link
            href={`/pacientes/${recente.id}/anamnese`}
            className="flex items-center gap-2 rounded-full bg-teal-500 px-5 py-2 text-sm font-bold text-white transition hover:bg-teal-600"
          >
            <ClipboardList className="size-4" />
            Preencher anamnese
          </Link>
          <button type="button" onClick={() => setRecente(null)} aria-label="Fechar" className="text-teal-600/70 hover:text-teal-700">
            <X className="size-5" />
          </button>
        </div>
      )}

      <Toast aviso={aviso} fechar={fecharAviso} />
    </form>
  );
}
