import type { Respostas } from "./ficha";
import { lerSessao, limparSessao, type Sessao } from "./sessao";

export type Sexo = "F" | "M" | "O";

export const SEXOS: { valor: Sexo; rotulo: string }[] = [
  { valor: "F", rotulo: "Feminino" },
  { valor: "M", rotulo: "Masculino" },
  { valor: "O", rotulo: "Outro" },
];

export interface Paciente {
  id: string;
  nomeCompleto: string;
  cpf: string;
  dataNascimento: string;
  sexo: Sexo;
  queixa: string | null;
  responsavelNome: string | null;
  responsavelCpf: string | null;
  responsavelTelefone: string | null;
  criadoEm: string;
  atualizadoEm: string;
}

export type PacienteInput = Omit<Paciente, "id" | "criadoEm" | "atualizadoEm">;

export interface Anamnese {
  id: string;
  pacienteId: string;
  respostas: Respostas;
  concluida: boolean;
  atualizadoPorNome: string | null;
  criadoEm: string;
  atualizadoEm: string;
}

/** Registro salvo de uma ficha clínica (anamnese ou avaliação). */
export interface RegistroFicha {
  id: string;
  respostas: Respostas;
  concluida: boolean;
  atualizadoPorNome: string | null;
  atualizadoEm: string;
}

export interface Avaliacao extends RegistroFicha {
  pacienteId: string;
  /** AAAA-MM-DD */
  data: string;
  criadoEm: string;
}

export type Presenca = "presente" | "falta_justificada" | "falta";
export type Desempenho = "otimo" | "bom" | "regular" | "insatisfatorio";

export type ResultadoMeta = "avancou" | "estavel" | "dificuldade";

/** Meta do plano trabalhada numa sessão (descrição copiada na época). */
export interface MetaTrabalhada {
  id: string;
  descricao: string;
  resultado: ResultadoMeta | null;
}

export interface EvolucaoInput {
  /** AAAA-MM-DD */
  data: string;
  presenca: Presenca;
  duracao: number | null;
  objetivos: string | null;
  atividades: string | null;
  desempenho: Desempenho | null;
  observacoes: string | null;
  proximaSessao: string | null;
  planoId?: string | null;
  metas?: { id: string; resultado: ResultadoMeta | null }[];
}

export interface Evolucao extends Omit<EvolucaoInput, "metas"> {
  planoId: string | null;
  metas: MetaTrabalhada[] | null;
  id: string;
  pacienteId: string;
  criadoPorId: string;
  criadoPorNome: string;
  criadoEm: string;
  atualizadoEm: string;
}

export type StatusPlano = "rascunho" | "ativo" | "encerrado";
export type StatusMeta = "nao_iniciada" | "em_andamento" | "atingida" | "suspensa";

export interface Meta {
  id: string;
  descricao: string;
  /** AAAA-MM-DD */
  prazo: string | null;
  status: StatusMeta;
}

export interface PlanoInput {
  status: StatusPlano;
  /** AAAA-MM-DD */
  inicio: string;
  revisao: string | null;
  frequencia: string | null;
  duracaoSessao: number | null;
  diagnostico: string | null;
  objetivoGeral: string | null;
  metas: Meta[];
  estrategias: string | null;
  orientacoes: string | null;
  encaminhamentos: string | null;
  criteriosAlta: string | null;
  motivoEncerramento?: string | null;
}

export interface Plano extends PlanoInput {
  id: string;
  pacienteId: string;
  motivoEncerramento: string | null;
  ativadoEm: string | null;
  encerradoEm: string | null;
  atualizadoPorNome: string | null;
  criadoEm: string;
  atualizadoEm: string;
}

export type TipoDocumento = "relatorio" | "declaracao" | "encaminhamento" | "orientacoes" | "outro";

export interface DocumentoInput {
  tipo: TipoDocumento;
  titulo: string;
  /** AAAA-MM-DD */
  data: string;
  conteudo: string;
}

export interface Documento extends DocumentoInput {
  id: string;
  pacienteId: string;
  criadoPorId: string;
  criadoPorNome: string;
  criadoEm: string;
  atualizadoEm: string;
}

export type TipoExame =
  | "audiometria"
  | "imitanciometria"
  | "emissoes"
  | "bera"
  | "processamento"
  | "laudo"
  | "imagem"
  | "outro";

export interface Anexo {
  id: string;
  pacienteId: string;
  tipo: TipoExame;
  /** data do exame (AAAA-MM-DD) */
  data: string;
  descricao: string | null;
  nomeOriginal: string;
  mime: string;
  tamanho: number;
  enviadoPorId: string;
  enviadoPorNome: string;
  criadoEm: string;
}

export type StatusAgendamento = "agendada" | "realizada" | "falta" | "cancelada";

export interface Agendamento {
  id: string;
  pacienteId: string;
  /** AAAA-MM-DD */
  data: string;
  /** HH:MM */
  hora: string;
  duracao: number;
  status: StatusAgendamento;
  observacao: string | null;
  profissionalId: string;
  profissionalNome: string;
  serieId: string | null;
  criadoPorNome: string;
  criadoEm: string;
}

export interface NovoAgendamento {
  data: string;
  hora: string;
  duracao: number;
  profissionalId?: string;
  observacao?: string | null;
  /** total de sessões semanais (1 = só esta) */
  semanas?: number;
}

export interface UsuarioResumo {
  id: string;
  nome: string;
  email: string;
}

export interface LogoAudiometria {
  srt: number | null;
  iprf: number | null;
}

export interface AudiometriaInput {
  /** AAAA-MM-DD */
  data: string;
  /** { od|oe: { aerea|ossea: { "<Hz>": dB } } } */
  limiares: { od: { aerea: Record<string, number>; ossea: Record<string, number> }; oe: { aerea: Record<string, number>; ossea: Record<string, number> } };
  logo: { od: LogoAudiometria; oe: LogoAudiometria };
  observacoes: string | null;
  conclusao: string | null;
}

export interface Audiometria extends AudiometriaInput {
  id: string;
  pacienteId: string;
  criadoPorId: string;
  criadoPorNome: string;
  criadoEm: string;
  atualizadoEm: string;
}

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

/** Chamada autenticada; com `json` false não define Content-Type (ex.: FormData) e devolve a Response. */
async function chamar(caminho: string, init: RequestInit | undefined, json: boolean): Promise<Response> {
  const token = lerSessao()?.token;
  let res: Response;
  try {
    res = await fetch(`${BASE}${caminho}`, {
      ...init,
      headers: {
        ...(json ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...init?.headers,
      },
    });
  } catch {
    throw new Error("Não foi possível conectar ao servidor.");
  }
  if (res.status === 401 && !caminho.startsWith("/auth/")) {
    limparSessao();
    window.location.replace("/login?expirou=1");
    throw new Error("Sessão expirada, faça login novamente.");
  }
  if (!res.ok) {
    const corpo = await res.json().catch(() => null);
    const msg = Array.isArray(corpo?.message)
      ? corpo.message[0]
      : (corpo?.message ?? "Erro inesperado.");
    throw new Error(msg);
  }
  return res;
}

async function req<T>(caminho: string, init?: RequestInit): Promise<T> {
  const res = await chamar(caminho, init, true);
  return res.status === 204 ? (undefined as T) : res.json();
}

export const api = {
  login: (email: string, senha: string) =>
    req<Sessao>("/auth/login", { method: "POST", body: JSON.stringify({ email, senha }) }),
  esqueciSenha: (email: string) =>
    req<{ mensagem: string }>("/auth/esqueci-senha", { method: "POST", body: JSON.stringify({ email }) }),
  verificarToken: (token: string) =>
    req<{ email: string }>("/auth/redefinir-senha/verificar", { method: "POST", body: JSON.stringify({ token }) }),
  redefinirSenha: (token: string, senha: string) =>
    req<{ mensagem: string }>("/auth/redefinir-senha", { method: "POST", body: JSON.stringify({ token, senha }) }),
  listar: (busca = "") =>
    req<Paciente[]>(`/pacientes${busca ? `?busca=${encodeURIComponent(busca)}` : ""}`),
  obter: (id: string) => req<Paciente>(`/pacientes/${id}`),
  criar: (dados: PacienteInput) =>
    req<Paciente>("/pacientes", { method: "POST", body: JSON.stringify(dados) }),
  atualizar: (id: string, dados: PacienteInput) =>
    req<Paciente>(`/pacientes/${id}`, { method: "PATCH", body: JSON.stringify(dados) }),
  remover: (id: string) => req<void>(`/pacientes/${id}`, { method: "DELETE" }),
  obterAnamnese: (pacienteId: string) =>
    req<{ anamnese: Anamnese | null }>(`/pacientes/${pacienteId}/anamnese`).then((r) => r.anamnese),
  salvarAnamnese: (pacienteId: string, respostas: Respostas, concluida = false) =>
    req<Anamnese>(`/pacientes/${pacienteId}/anamnese`, {
      method: "PUT",
      body: JSON.stringify({ respostas, concluida }),
    }),
  listarAvaliacoes: (pacienteId: string) => req<Avaliacao[]>(`/pacientes/${pacienteId}/avaliacoes`),
  /** Cria (sem `id`) ou atualiza; a data vem da resposta `dataAvaliacao`. */
  salvarAvaliacao: (pacienteId: string, id: string | null, respostas: Respostas, concluida = false) =>
    req<Avaliacao>(`/pacientes/${pacienteId}/avaliacoes${id ? `/${id}` : ""}`, {
      method: id ? "PUT" : "POST",
      body: JSON.stringify({ data: respostas.dataAvaliacao, respostas, concluida }),
    }),
  listarEvolucoes: (pacienteId: string) => req<Evolucao[]>(`/pacientes/${pacienteId}/evolucoes`),
  /** Cria (sem `id`) ou atualiza uma sessão. */
  salvarEvolucao: (pacienteId: string, id: string | null, dados: EvolucaoInput) =>
    req<Evolucao>(`/pacientes/${pacienteId}/evolucoes${id ? `/${id}` : ""}`, {
      method: id ? "PUT" : "POST",
      body: JSON.stringify(dados),
    }),
  removerEvolucao: (pacienteId: string, id: string) =>
    req<void>(`/pacientes/${pacienteId}/evolucoes/${id}`, { method: "DELETE" }),
  listarPlanos: (pacienteId: string) => req<Plano[]>(`/pacientes/${pacienteId}/planos`),
  /** Cria (sem `id`) ou atualiza um plano. */
  salvarPlano: (pacienteId: string, id: string | null, dados: PlanoInput) =>
    req<Plano>(`/pacientes/${pacienteId}/planos${id ? `/${id}` : ""}`, {
      method: id ? "PUT" : "POST",
      body: JSON.stringify(dados),
    }),
  removerPlano: (pacienteId: string, id: string) =>
    req<void>(`/pacientes/${pacienteId}/planos/${id}`, { method: "DELETE" }),
  listarDocumentos: (pacienteId: string) => req<Documento[]>(`/pacientes/${pacienteId}/documentos`),
  salvarDocumento: (pacienteId: string, id: string | null, dados: DocumentoInput) =>
    req<Documento>(`/pacientes/${pacienteId}/documentos${id ? `/${id}` : ""}`, {
      method: id ? "PUT" : "POST",
      body: JSON.stringify(dados),
    }),
  removerDocumento: (pacienteId: string, id: string) =>
    req<void>(`/pacientes/${pacienteId}/documentos/${id}`, { method: "DELETE" }),
  listarAudiometrias: (pacienteId: string) => req<Audiometria[]>(`/pacientes/${pacienteId}/audiometrias`),
  salvarAudiometria: (pacienteId: string, id: string | null, dados: AudiometriaInput) =>
    req<Audiometria>(`/pacientes/${pacienteId}/audiometrias${id ? `/${id}` : ""}`, {
      method: id ? "PUT" : "POST",
      body: JSON.stringify(dados),
    }),
  removerAudiometria: (pacienteId: string, id: string) =>
    req<void>(`/pacientes/${pacienteId}/audiometrias/${id}`, { method: "DELETE" }),
  listarUsuarios: () => req<UsuarioResumo[]>("/usuarios"),
  listarAgendamentos: (pacienteId: string) => req<Agendamento[]>(`/pacientes/${pacienteId}/agendamentos`),
  /** devolve as sessões criadas (várias, se semanal) */
  agendar: (pacienteId: string, dados: NovoAgendamento) =>
    req<Agendamento[]>(`/pacientes/${pacienteId}/agendamentos`, { method: "POST", body: JSON.stringify(dados) }),
  atualizarAgendamento: (
    pacienteId: string,
    id: string,
    dados: Partial<Pick<Agendamento, "status" | "data" | "hora" | "duracao" | "observacao">>,
  ) => req<Agendamento>(`/pacientes/${pacienteId}/agendamentos/${id}`, { method: "PATCH", body: JSON.stringify(dados) }),
  /** `serie`: também as próximas agendadas da mesma série */
  removerAgendamento: (pacienteId: string, id: string, serie = false) =>
    req<void>(`/pacientes/${pacienteId}/agendamentos/${id}${serie ? "?serie=1" : ""}`, { method: "DELETE" }),
  listarAnexos: (pacienteId: string) => req<Anexo[]>(`/pacientes/${pacienteId}/anexos`),
  /** `dados`: arquivo + tipo, data, descricao (multipart) */
  enviarAnexo: async (pacienteId: string, dados: FormData) =>
    (await chamar(`/pacientes/${pacienteId}/anexos`, { method: "POST", body: dados }, false)).json() as Promise<Anexo>,
  baixarAnexo: async (pacienteId: string, id: string) =>
    (await chamar(`/pacientes/${pacienteId}/anexos/${id}/arquivo`, undefined, false)).blob(),
  removerAnexo: (pacienteId: string, id: string) =>
    req<void>(`/pacientes/${pacienteId}/anexos/${id}`, { method: "DELETE" }),
  removerAvaliacao: (pacienteId: string, id: string) =>
    req<void>(`/pacientes/${pacienteId}/avaliacoes/${id}`, { method: "DELETE" }),
};
