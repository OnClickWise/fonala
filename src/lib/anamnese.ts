import {
  CalendarDays,
  Heart,
  Mail,
  MessageSquareText,
  Phone,
  Sprout,
  User,
  UserRound,
} from "lucide-react";
import type { Etapa } from "./ficha";

/** Perguntas da anamnese. Para incluir/alterar perguntas, edite só este arquivo. */
const USO = ["Nunca usou", "Já usou", "Usa atualmente"];

export const ETAPAS: Etapa[] = [
  {
    id: "identificacao",
    titulo: "Identificação",
    secoes: [
      {
        id: "paciente",
        titulo: "Identificação do Paciente",
        icone: User,
        dadosCadastro: true,
        perguntas: [
          { id: "telefone", tipo: "linha", rotulo: "Telefone", placeholder: "(00) 00000-0000", mascara: "telefone", icone: Phone, col: 3 },
          { id: "email", tipo: "linha", rotulo: "E-mail", placeholder: "Digite o e-mail", email: true, icone: Mail, col: 3 },
          { id: "responsavel", tipo: "linha", rotulo: "Responsável (se aplicável)", placeholder: "Nome do responsável", icone: UserRound, col: 3 },
          { id: "parentesco", tipo: "selecao", rotulo: "Grau de parentesco", col: 3, opcoes: ["Mãe", "Pai", "Avó / Avô", "Tia / Tio", "Irmã / Irmão", "Cônjuge", "Outro"] },
        ],
      },
    ],
  },
  {
    id: "historico",
    titulo: "Histórico",
    secoes: [
      {
        id: "desenvolvimento",
        titulo: "Histórico do Desenvolvimento",
        icone: Sprout,
        perguntas: [
          { id: "gestacao", tipo: "selecao", rotulo: "Gestação", opcoes: ["A termo", "Pré-termo", "Pós-termo"], col: 3 },
          { id: "parto", tipo: "selecao", rotulo: "Parto", opcoes: ["Normal", "Cesárea", "Fórceps"], col: 2 },
          { id: "idadeGestacional", tipo: "linha", rotulo: "Idade gestacional", placeholder: "Semanas", sufixo: "sem", col: 2 },
          { id: "pesoNascimento", tipo: "linha", rotulo: "Peso ao nascer", placeholder: "____", sufixo: "g", col: 2 },
          { id: "ocorrenciasGestacao", tipo: "linha", rotulo: "Ocorrências na gestação/parto", placeholder: "Descreva, se houver...", col: 3 },
          {
            id: "marcos",
            tipo: "checks",
            rotulo: "Desenvolvimento neuropsicomotor",
            col: 7,
            itens: [
              { id: "sustentouCabeca", rotulo: "Sustentou a cabeça" },
              { id: "sentou", rotulo: "Sentou" },
              { id: "engatinhou", rotulo: "Engatinhou" },
              { id: "andou", rotulo: "Andou" },
              { id: "falou", rotulo: "Falou (primeiras palavras)" },
            ],
          },
          { id: "idadeMarcos", tipo: "linha", rotulo: "Idade aproximada", placeholder: "Ex.: 12 meses", col: 2 },
          { id: "atrasoDesenvolvimento", tipo: "simnao", rotulo: "Houve atraso no desenvolvimento?", detalhe: "Descreva...", col: 3 },
        ],
      },
    ],
  },
  {
    id: "saude",
    titulo: "Saúde e Hábitos",
    secoes: [
      {
        id: "saude",
        titulo: "Histórico de Saúde",
        icone: Heart,
        perguntas: [
          {
            id: "condicoes",
            tipo: "checks",
            rotulo: "Possui ou já teve alguma das condições abaixo?",
            col: 7,
            colunas: 2,
            itens: [
              { id: "otites", rotulo: "Otites de repetição" },
              { id: "problemasAuditivos", rotulo: "Problemas auditivos" },
              { id: "convulsoes", rotulo: "Convulsões" },
              { id: "respiratorios", rotulo: "Problemas respiratórios (asma, rinite, etc.)" },
              { id: "alergias", rotulo: "Alergias" },
              { id: "medicacaoContinua", rotulo: "Uso de medicação contínua" },
              { id: "cirurgias", rotulo: "Cirurgias" },
              { id: "internacoes", rotulo: "Internações" },
              { id: "neurologicas", rotulo: "Doenças neurológicas" },
              { id: "outrasCondicoes", rotulo: "Outras", detalhe: "Especifique..." },
            ],
          },
          { id: "medicacoes", tipo: "texto", rotulo: "Medicações em uso", placeholder: "Informe o nome, dose e frequência...", col: 5 },
        ],
      },
      {
        id: "habitos",
        titulo: "Hábitos e Rotina",
        icone: CalendarDays,
        perguntas: [
          { id: "alimentacao", tipo: "selecao", rotulo: "Alimentação", opcoes: ["Adequada", "Seletiva", "Com dificuldade"], col: 2 },
          { id: "sono", tipo: "selecao", rotulo: "Sono", opcoes: ["Bom", "Regular", "Agitado", "Ruim"], col: 2 },
          { id: "eliminacao", tipo: "selecao", rotulo: "Eliminação", opcoes: ["Controle total", "Controle parcial", "Sem controle", "Usa fralda"], col: 2 },
          { id: "chupeta", tipo: "selecao", rotulo: "Uso de chupeta", opcoes: USO, col: 2 },
          { id: "mamadeira", tipo: "selecao", rotulo: "Uso de mamadeira", opcoes: USO, col: 2 },
          { id: "roiUnhas", tipo: "selecao", rotulo: "Rói unhas?", opcoes: ["Não", "Às vezes", "Frequentemente"], col: 2 },
        ],
      },
    ],
  },
  {
    id: "queixa",
    titulo: "Queixa e Expectativas",
    secoes: [
      {
        id: "queixa",
        titulo: "Queixa Principal e Expectativas",
        icone: MessageSquareText,
        perguntas: [
          { id: "queixaPrincipal", tipo: "texto", rotulo: "Queixa principal", obrigatoria: true, placeholder: "Descreva o motivo da busca pelo atendimento...", col: 6 },
          { id: "expectativas", tipo: "texto", rotulo: "Expectativas com a terapia", placeholder: "O que espera alcançar com o tratamento?", col: 6 },
        ],
      },
    ],
  },
];
