# FONALA · Audiologia e Fonoterapia — fonala (web)

> O sistema tem dois repositórios: **fonala (web)** (este) e **fonala_api (API)** (https://github.com/OnClickWise/fonala_api).
> Para rodar localmente, clone os dois lado a lado como `frontend/` e `backend/`.

Sistema de cadastro de pacientes.

| Pasta       | Stack                                      | Porta |
|-------------|--------------------------------------------|-------|
| `backend/`  | NestJS 11 + TypeORM + SQLite (better-sqlite3) | 3001  |
| `frontend/` | Next.js 16 + Tailwind 4 + lucide-react     | 3000  |

## Rodando

```bash
# API
cd backend
npm install
npm run start:dev        # http://localhost:3001/api

# Web (outro terminal)
cd frontend
npm install
npm run dev              # http://localhost:3000
```

O banco `backend/fonala.db` é criado automaticamente na primeira execução.

## Login

Toda a API (exceto `POST /api/auth/login`) exige `Authorization: Bearer <token>` (JWT, 8h).
Na primeira execução, se não houver usuários, é criado o administrador definido em
`backend/.env` (`ADMIN_EMAIL` / `ADMIN_SENHA`, padrão `admin@fonala.com` / `fonala123`).
Copie `backend/.env.example` para `backend/.env` e defina um `JWT_SECRET` próprio.

Depois do login o sistema abre a **lista de pacientes** (`/pacientes`; a raiz `/`
também redireciona para ela). O formulário de cadastro fica em `/pacientes/novo`,
aberto pelo botão **Novo paciente**.

### Esqueci minha senha

`/login` → **Esqueci minha senha** (`/esqueci-senha`) envia por e-mail um link
`/redefinir-senha?token=…`, válido por 30 minutos e de uso único (o banco guarda só o
SHA-256 do token; no máximo um pedido por minuto por conta). A resposta é sempre a
mesma, exista ou não o e-mail. Para enviar e-mails de verdade configure `SMTP_*` em
`backend/.env`; **sem `SMTP_HOST` o link aparece apenas no log do backend** (desenvolvimento).

## API — `/api/pacientes`

| Método | Rota                  | Descrição                         |
|--------|-----------------------|-----------------------------------|
| POST   | `/auth/login`         | `{ email, senha }` → `{ token, usuario }` |
| GET    | `/auth/me`            | Usuário logado                    |
| POST   | `/auth/esqueci-senha` | `{ email }` → envia o link (público) |
| POST   | `/auth/redefinir-senha/verificar` | `{ token }` → `{ email }` (público) |
| POST   | `/auth/redefinir-senha` | `{ token, senha }` → troca a senha (público) |
| POST   | `/usuarios`           | Cria usuário `{ nome, email, senha }` (senha ≥ 8, letras e números) |
| GET    | `/usuarios`           | Lista usuários                    |
| GET    | `/pacientes/:id/anamnese` | `{ anamnese }` (null se não preenchida) |
| PUT    | `/pacientes/:id/anamnese` | Cria/atualiza `{ respostas, concluida? }` (uma por paciente; sem `concluida` = rascunho; concluir exige `queixaPrincipal`) |
| GET    | `/pacientes/:id/avaliacoes` | Avaliações do paciente (mais recente primeiro) |
| GET    | `/pacientes/:id/avaliacoes/:avaliacaoId` | Uma avaliação |
| POST   | `/pacientes/:id/avaliacoes` | Cria `{ data, respostas, concluida? }` (concluir exige `conclusao`) |
| PUT    | `/pacientes/:id/avaliacoes/:avaliacaoId` | Atualiza |
| DELETE | `/pacientes/:id/avaliacoes/:avaliacaoId` | Exclui (só rascunho; concluída → 409) |
| GET    | `/pacientes/:id/evolucoes` | Sessões do paciente (mais recente primeiro) |
| POST   | `/pacientes/:id/evolucoes` | Registra sessão `{ data, presenca, duracao?, objetivos?, atividades, desempenho?, observacoes?, proximaSessao? }` |
| PUT    | `/pacientes/:id/evolucoes/:evolucaoId` | Edita (só quem registrou; outro usuário → 403) |
| DELETE | `/pacientes/:id/evolucoes/:evolucaoId` | Exclui (só quem registrou) |
| GET    | `/pacientes/:id/planos` | Planos terapêuticos (mais recente primeiro) |
| POST   | `/pacientes/:id/planos` | Cria plano `{ status: rascunho\|ativo, inicio, revisao?, frequencia?, duracaoSessao?, diagnostico?, objetivoGeral?, metas[], estrategias?, orientacoes?, encaminhamentos?, criteriosAlta? }` |
| PUT    | `/pacientes/:id/planos/:planoId` | Atualiza / ativa / encerra (`status: encerrado` + `motivoEncerramento`) |
| DELETE | `/pacientes/:id/planos/:planoId` | Exclui (só rascunho) |
| GET/POST | `/pacientes/:id/documentos` | Documentos emitidos / emite `{ tipo, titulo, data, conteudo }` |
| PUT/DELETE | `/pacientes/:id/documentos/:docId` | Edita / exclui (só quem emitiu) |
| GET    | `/pacientes/:id/anexos` | Exames anexados |
| POST   | `/pacientes/:id/anexos` | multipart: `arquivo` (PDF/JPG/PNG/WEBP, até 10 MB) + `tipo`, `data`, `descricao?` |
| GET    | `/pacientes/:id/anexos/:anexoId/arquivo` | Download do arquivo (autenticado) |
| DELETE | `/pacientes/:id/anexos/:anexoId` | Exclui registro e arquivo (só quem enviou) |
| GET/POST | `/pacientes/:id/agendamentos` | Cronograma / agenda `{ data, hora, duracao, profissionalId?, observacao?, semanas? }` |
| PATCH  | `/pacientes/:id/agendamentos/:agId` | Situação (`realizada`, `falta`, `cancelada`, `agendada`) ou remarcação |
| DELETE | `/pacientes/:id/agendamentos/:agId[?serie=1]` | Exclui (com `serie=1`, também as próximas agendadas da série) |
| GET/POST | `/pacientes/:id/audiometrias` | Audiometrias / registra `{ data, limiares, logo, observacoes?, conclusao? }` |
| PUT/DELETE | `/pacientes/:id/audiometrias/:audId` | Edita / exclui (só quem registrou) |
| POST   | `/pacientes`          | Cadastra paciente                 |
| GET    | `/pacientes?busca=`   | Lista (busca por nome ou CPF)     |
| GET    | `/pacientes/:id`      | Detalhe                           |
| PATCH  | `/pacientes/:id`      | Atualiza                          |
| DELETE | `/pacientes/:id`      | Exclui                            |

Campos: `nomeCompleto`, `cpf`, `dataNascimento` (AAAA-MM-DD), `sexo` (`F`/`M`/`O`),
`queixa`, `responsavelNome`, `responsavelCpf`, `responsavelTelefone`.
CPF e telefone aceitam máscara (são salvos só com dígitos). CPF é validado e único.

## Anamnese

As perguntas ficam em `frontend/src/lib/anamnese.ts`, organizadas em 4 etapas
(Identificação, Histórico, Saúde e Hábitos, Queixa e Expectativas) → 5 seções → 
perguntas (`linha`, `texto`, `selecao`, `simnao`, `checks`, com largura `col` de 12). Para
incluir ou alterar perguntas basta editar essa lista: o backend guarda as respostas
por chave (`simple-json`) e não precisa de mudança. Uma seção marcada `infantil`
só aparece para pacientes menores de 18 anos (hoje nenhuma usa).

## Avaliação

Rota `/pacientes/[id]/avaliacao`. Diferente da anamnese, um paciente pode ter **várias
avaliações** (inicial, reavaliações), cada uma com data; o histórico fica no topo da
página. As perguntas ficam em `frontend/src/lib/avaliacao.ts` (Dados → Audição → Fala e
Linguagem → Conclusão). Anamnese e avaliação usam o mesmo componente
`components/FichaClinica.tsx` (estrutura genérica em `lib/ficha.ts`). O audiograma
completo ficará no módulo "Audiometria Fonala".

## Evolução

Rota `/pacientes/[id]/evolucao` (também pelo card "Relatório de Evolução"). Cada sessão
de terapia é um registro: data, presença (`presente`, `falta_justificada`, `falta`),
duração, objetivos, atividades (obrigatórias quando presente), desempenho
(`otimo`/`bom`/`regular`/`insatisfatorio`), observações e planejamento da próxima sessão.
Em faltas só valem data, presença e observações. A página mostra um resumo (sessões,
faltas, frequência, última sessão), o formulário rápido e a linha do tempo numerada, com
busca e filtro. O planejamento da última sessão aparece como sugestão para os objetivos.
Só o autor edita/exclui a própria sessão.

**Metas do plano nas sessões:** com um plano terapêutico ativo, o formulário da sessão
lista as metas do plano (menos as suspensas) para marcar as trabalhadas, cada uma com
resultado opcional (`avancou`, `estavel`, `dificuldade`). A API recebe
`planoId` + `metas: [{ id, resultado? }]`, valida que as metas são do plano do paciente
e guarda uma cópia da descrição da época. No Plano Terapêutico cada meta mostra em
quantas sessões foi trabalhada, o último resultado e a lista de sessões. "Revisar plano"
mantém o `id` das metas copiadas, então o histórico continua na nova versão.

## Plano Terapêutico

Rota `/pacientes/[id]/plano`. Situações: **rascunho → ativo → encerrado** (encerrado é
só consulta; só rascunho pode ser excluído). **Um plano ativo por paciente**: ativar um
plano encerra o anterior ("Substituído por novo plano"). Ativar exige objetivo geral e
ao menos uma meta. Cada meta (máx. 30) tem descrição, prazo e situação
(`nao_iniciada`, `em_andamento`, `atingida`, `suspensa`), com barra de progresso.
"Revisar plano" cria a nova versão copiando o plano atual sem as metas atingidas; sem
plano anterior, diagnóstico, frequência e prazo de revisão vêm da última avaliação concluída.

## Documentos

Rota `/pacientes/[id]/documentos`. Modelos: relatório fonoaudiológico (monta queixa,
avaliação, plano com metas e resumo da evolução), declaração de comparecimento,
encaminhamento, orientações à família e documento em branco. O texto vem pré-preenchido
e é editado na própria folha (timbre FONALA + assinatura); **Imprimir** imprime só a folha.
Só quem emitiu edita/exclui; os demais veem em modo leitura.

## Anexos de Exames

Rota `/pacientes/[id]/anexos`. Envio por arrastar/soltar ou clique; o formato é
verificado **pelo conteúdo** (PDF, JPG, PNG, WEBP), não pela extensão; até 10 MB.
Os arquivos ficam em `UPLOADS_DIR/anexos/<pacienteId>/` com nome aleatório e são
apagados ao excluir o exame ou o paciente. Visualização (PDF/imagem) e download dentro
do sistema, sempre com login. **Faça backup da pasta `uploads/` junto com o banco.**

## Cronograma de Sessões

Rota `/pacientes/[id]/cronograma`. Agenda com calendário mensal, sessões avulsas ou
semanais (até 52), profissional responsável e observação. Situações: agendada,
realizada, falta (só para hoje ou antes), cancelada (libera o horário). Remarcar,
desfazer, excluir uma sessão ou a série a partir dela. **Conflito:** o mesmo profissional
não pode ter sessões sobrepostas, de qualquer paciente. Sessão realizada tem atalho
"Registrar evolução" (abre a Evolução com a data da sessão).

## Audiometria

Rota `/pacientes/[id]/audiometria`. Audiograma interativo (clique para marcar; clique
de novo para apagar) com símbolos padrão — OD vermelho (○ aérea, &lt; óssea), OE azul
(✕ aérea, &gt; óssea) — e tabela de limiares (-10 a 120 dB, de 5 em 5; aérea 250–8k Hz,
óssea 500–4k Hz). Classificação **sugerida** por orelha: grau pela média tritonal
(500/1k/2k Hz, Lloyd & Kaplan) e tipo pelo gap aéreo-ósseo (condutiva, neurossensorial,
mista), com botão para usar como conclusão. Logoaudiometria (SRT e IPRF), comparação
com o exame anterior e histórico de exames.

## Testes

```bash
cd backend
npm test           # unitários (validação de CPF)
npm run test:e2e   # API completa: login, redefinição de senha, usuários, pacientes, anamnese (SQLite em memória)
```

## Variáveis de ambiente

- backend (`backend/.env`): `PORT` (3001), `DB_PATH` (fonala.db), `CORS_ORIGIN` (http://localhost:3000),
  `JWT_SECRET`, `ADMIN_NOME`, `ADMIN_EMAIL`, `ADMIN_SENHA`,
  `APP_URL` (endereço do frontend no link do e-mail), `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`,
  `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`, `UPLOADS_DIR` (uploads — pasta dos anexos)
- frontend: `NEXT_PUBLIC_API_URL` (http://localhost:3001/api)
