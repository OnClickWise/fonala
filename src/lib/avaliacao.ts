import {
  AudioLines,
  ClipboardCheck,
  Ear,
  MessageCircle,
  Mic,
  ScanSearch,
  Smile,
  UserRound,
} from "lucide-react";
import type { Etapa } from "./ficha";

/**
 * Perguntas da avaliação fonoaudiológica/audiológica.
 * Para incluir/alterar perguntas, edite só este arquivo.
 * (O audiograma completo fica para o módulo "Audiometria Fonala".)
 */
const GRAU = ["Adequada", "Alteração leve", "Alteração moderada", "Alteração grave"];
const MEATOSCOPIA = ["Sem alterações", "Cerúmen parcial", "Cerúmen obstruindo", "Corpo estranho", "Secreção", "Outra alteração"];

export const ETAPAS_AVALIACAO: Etapa[] = [
  {
    id: "dados",
    titulo: "Dados",
    secoes: [
      {
        id: "dadosAvaliacao",
        titulo: "Dados da Avaliação",
        icone: ScanSearch,
        dadosCadastro: true,
        perguntas: [
          { id: "dataAvaliacao", tipo: "data", rotulo: "Data da avaliação", obrigatoria: true, col: 3 },
          { id: "tipoAvaliacao", tipo: "selecao", rotulo: "Tipo", opcoes: ["Avaliação inicial", "Reavaliação", "Avaliação complementar"], col: 3 },
          { id: "areaAvaliada", tipo: "selecao", rotulo: "Área avaliada", opcoes: ["Audiologia", "Fonoaudiologia", "Audiologia e Fonoaudiologia"], col: 3 },
          { id: "acompanhante", tipo: "linha", rotulo: "Acompanhante", placeholder: "Quem acompanhou o paciente", icone: UserRound, col: 3 },
        ],
      },
    ],
  },
  {
    id: "audicao",
    titulo: "Audição",
    secoes: [
      {
        id: "auditiva",
        titulo: "Avaliação Auditiva",
        icone: Ear,
        perguntas: [
          { id: "meatoscopiaOD", tipo: "selecao", rotulo: "Meatoscopia — orelha direita", opcoes: MEATOSCOPIA, col: 3 },
          { id: "meatoscopiaOE", tipo: "selecao", rotulo: "Meatoscopia — orelha esquerda", opcoes: MEATOSCOPIA, col: 3 },
          { id: "usaDispositivo", tipo: "simnao", rotulo: "Usa aparelho auditivo / implante coclear?", detalhe: "Qual, lado e há quanto tempo...", col: 6 },
          {
            id: "sintomasAuditivos",
            tipo: "checks",
            rotulo: "Sintomas relatados",
            col: 7,
            colunas: 2,
            itens: [
              { id: "zumbido", rotulo: "Zumbido" },
              { id: "tontura", rotulo: "Tontura / vertigem" },
              { id: "plenitude", rotulo: "Plenitude auricular" },
              { id: "hiperacusia", rotulo: "Hipersensibilidade a sons" },
              { id: "dificuldadeRuido", rotulo: "Dificuldade de compreender no ruído" },
              { id: "otalgia", rotulo: "Dor de ouvido (otalgia)" },
            ],
          },
          {
            id: "examesRealizados",
            tipo: "checks",
            rotulo: "Exames realizados",
            col: 5,
            colunas: 2,
            itens: [
              { id: "exAudiometria", rotulo: "Audiometria tonal" },
              { id: "exLogoaudiometria", rotulo: "Logoaudiometria" },
              { id: "exImitanciometria", rotulo: "Imitanciometria" },
              { id: "exEOA", rotulo: "Emissões otoacústicas" },
              { id: "exPEATE", rotulo: "PEATE / BERA" },
              { id: "exPAC", rotulo: "Processamento auditivo" },
            ],
          },
          {
            id: "achadosAudiologicos",
            tipo: "texto",
            rotulo: "Resumo dos achados audiológicos",
            placeholder: "Tipo e grau da perda por orelha, curva timpanométrica, reflexos acústicos, IPRF...",
            col: 12,
          },
        ],
      },
    ],
  },
  {
    id: "fala",
    titulo: "Fala e Linguagem",
    secoes: [
      {
        id: "linguagem",
        titulo: "Linguagem",
        icone: MessageCircle,
        perguntas: [
          { id: "compreensao", tipo: "selecao", rotulo: "Compreensão", opcoes: GRAU, col: 3 },
          { id: "expressao", tipo: "selecao", rotulo: "Expressão", opcoes: GRAU, col: 3 },
          { id: "nivelExpressao", tipo: "selecao", rotulo: "Nível de expressão", opcoes: ["Não verbal", "Palavras isoladas", "Frases simples", "Frases complexas", "Discurso organizado"], col: 3 },
          { id: "leituraEscrita", tipo: "selecao", rotulo: "Leitura e escrita", opcoes: ["Adequada", "Em aquisição", "Alterada", "Não se aplica"], col: 3 },
          { id: "obsLinguagem", tipo: "texto", rotulo: "Observações", placeholder: "Vocabulário, pragmática, narrativa, atenção compartilhada...", col: 12 },
        ],
      },
      {
        id: "falaFluencia",
        titulo: "Fala e Fluência",
        icone: AudioLines,
        perguntas: [
          { id: "articulacao", tipo: "selecao", rotulo: "Articulação", opcoes: ["Adequada", "Alterações fonéticas", "Alterações fonológicas", "Alterações mistas"], col: 4 },
          { id: "inteligibilidade", tipo: "selecao", rotulo: "Inteligibilidade", opcoes: ["Boa", "Regular", "Ruim"], col: 4 },
          { id: "velocidadeFala", tipo: "selecao", rotulo: "Velocidade de fala", opcoes: ["Adequada", "Aumentada", "Reduzida"], col: 4 },
          { id: "processosFonologicos", tipo: "linha", rotulo: "Processos / trocas observados", placeholder: "Ex.: omissão de /r/, troca de /f/ por /p/...", col: 8 },
          { id: "fluencia", tipo: "selecao", rotulo: "Fluência", opcoes: ["Fluente", "Disfluências comuns", "Gagueira leve", "Gagueira moderada", "Gagueira grave"], col: 4 },
        ],
      },
      {
        id: "voz",
        titulo: "Voz",
        icone: Mic,
        perguntas: [
          { id: "qualidadeVocal", tipo: "selecao", rotulo: "Qualidade vocal", opcoes: ["Adaptada", "Rouca", "Soprosa", "Áspera", "Tensa", "Nasal"], col: 3 },
          { id: "pitch", tipo: "selecao", rotulo: "Pitch", opcoes: ["Adequado", "Agudo", "Grave"], col: 3 },
          { id: "loudness", tipo: "selecao", rotulo: "Loudness", opcoes: ["Adequada", "Forte", "Fraca"], col: 3 },
          { id: "ressonancia", tipo: "selecao", rotulo: "Ressonância", opcoes: ["Equilibrada", "Hipernasal", "Hiponasal", "Laringofaríngea"], col: 3 },
        ],
      },
      {
        id: "motricidade",
        titulo: "Motricidade Orofacial",
        icone: Smile,
        perguntas: [
          {
            id: "alteracoesMO",
            tipo: "checks",
            rotulo: "Alterações observadas",
            col: 8,
            colunas: 2,
            itens: [
              { id: "moLabios", rotulo: "Lábios (tônus / vedamento)" },
              { id: "moLingua", rotulo: "Língua (tônus / mobilidade)" },
              { id: "moFreio", rotulo: "Frênulo lingual alterado" },
              { id: "moOclusao", rotulo: "Oclusão / mordida" },
              { id: "moDegluticao", rotulo: "Deglutição atípica" },
              { id: "moMastigacao", rotulo: "Mastigação alterada" },
            ],
          },
          { id: "respiracao", tipo: "selecao", rotulo: "Modo respiratório", opcoes: ["Nasal", "Oral", "Misto"], col: 4 },
        ],
      },
    ],
  },
  {
    id: "conclusao",
    titulo: "Conclusão",
    secoes: [
      {
        id: "conclusaoConduta",
        titulo: "Conclusão e Conduta",
        icone: ClipboardCheck,
        perguntas: [
          { id: "conclusao", tipo: "texto", rotulo: "Conclusão / hipótese diagnóstica", obrigatoria: true, placeholder: "Síntese dos achados e hipótese diagnóstica fonoaudiológica...", col: 6 },
          {
            id: "conduta",
            tipo: "checks",
            rotulo: "Conduta",
            col: 6,
            itens: [
              { id: "cdTerapia", rotulo: "Terapia fonoaudiológica" },
              { id: "cdAASI", rotulo: "Seleção / adaptação de AASI" },
              { id: "cdExames", rotulo: "Exames complementares" },
              { id: "cdEncaminhamento", rotulo: "Encaminhamento", detalhe: "Para qual especialidade..." },
              { id: "cdAlta", rotulo: "Alta / sem indicação de terapia" },
            ],
          },
          { id: "frequencia", tipo: "selecao", rotulo: "Frequência sugerida", opcoes: ["1x por semana", "2x por semana", "3x por semana", "Quinzenal", "Mensal"], col: 3 },
          { id: "reavaliarEm", tipo: "selecao", rotulo: "Reavaliar em", opcoes: ["1 mês", "3 meses", "6 meses", "12 meses"], col: 3 },
          { id: "orientacoes", tipo: "texto", rotulo: "Orientações ao paciente / família", placeholder: "Orientações dadas durante a devolutiva...", col: 6 },
        ],
      },
    ],
  },
];
