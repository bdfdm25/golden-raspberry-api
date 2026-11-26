# Golden Raspberry Awards API

[![CI](https://github.com/bdfdm25/golden-raspberry-api/actions/workflows/ci.yml/badge.svg)](https://github.com/bdfdm25/golden-raspberry-api/actions/workflows/ci.yml)

API RESTful que lê a lista de indicados e vencedores da categoria **Pior Filme** do Golden Raspberry
Awards a partir de um arquivo CSV, carrega os dados em um banco em memória na inicialização e expõe
os intervalos entre prêmios consecutivos de cada produtor.

## Stack

| Item      | Escolha                              | Motivo                                                                   |
| --------- | ------------------------------------ | ------------------------------------------------------------------------ |
| Runtime   | Node.js 22 / TypeScript 5.9 (ESM)    | `strict`, `exactOptionalPropertyTypes` e `verbatimModuleSyntax` ligados. |
| HTTP      | Express 5                            | Nível 2 de Richardson sem camadas desnecessárias.                        |
| Banco     | SQLite em memória (`better-sqlite3`) | SGBD embarcado, zero instalação externa.                                 |
| Validação | zod                                  | Validação de ambiente e de query params em um só lugar.                  |
| Logs      | pino                                 | Log estruturado com `requestId` e duração por requisição.                |
| Testes    | Vitest + Supertest                   | Integração (requisito) e unitários do domínio.                           |
| Mutação   | Stryker                              | Mede se os testes realmente detectam defeitos.                           |

## Como rodar

Pré-requisitos: Node.js 22 ou superior e npm. O CI roda no Node 22.

```bash
npm ci          # instala as dependências
npm run dev     # sobe a API em modo watch (http://localhost:3000)
```

Para executar a versão compilada:

```bash
npm run build
npm start
```

Ao subir, a aplicação lê o CSV, popula o banco em memória e só então começa a aceitar requisições.
Qualquer linha inválida aborta a inicialização com a mensagem apontando a linha (fail-fast), para
que a API nunca responda com base em dados parcialmente carregados.

### Variáveis de ambiente

Todas são opcionais (veja `.env.example`):

| Variável    | Padrão                 | Descrição                                               |
| ----------- | ---------------------- | ------------------------------------------------------- |
| `PORT`      | `3000`                 | Porta HTTP. `0` solicita uma porta efêmera ao SO.       |
| `NODE_ENV`  | `development`          | Em `development` os logs saem formatados (pino-pretty). |
| `LOG_LEVEL` | `info`                 | Nível do logger.                                        |
| `CSV_PATH`  | `./data/Movielist.csv` | Arquivo CSV carregado na inicialização.                 |

Para executar com outro conjunto de dados, basta apontar `CSV_PATH`:

```bash
CSV_PATH=/caminho/para/outro.csv npm start
```

## Endpoints

### `GET /producers/intervals`

Produtores com o menor e o maior intervalo entre dois prêmios consecutivos. Em caso de empate,
**todos** os produtores empatados são retornados.

```bash
curl http://localhost:3000/producers/intervals
```

```json
{
  "min": [{ "producer": "Joel Silver", "interval": 1, "previousWin": 1990, "followingWin": 1991 }],
  "max": [
    { "producer": "Matthew Vaughn", "interval": 13, "previousWin": 2002, "followingWin": 2015 }
  ]
}
```

### `GET /movies`

Listagem paginada dos filmes carregados.

| Query param | Padrão | Regras                |
| ----------- | ------ | --------------------- |
| `page`      | `1`    | inteiro ≥ 1           |
| `limit`     | `20`   | inteiro entre 1 e 100 |
| `year`      | —      | inteiro de 1 a 9999   |
| `winner`    | —      | `true` ou `false`     |

```bash
curl "http://localhost:3000/movies?year=1986&winner=true"
```

```json
{
  "data": [
    {
      "id": 36,
      "year": 1986,
      "title": "Howard the Duck",
      "studios": "Universal Studios",
      "producers": ["Gloria Katz"],
      "winner": true
    },
    {
      "id": 37,
      "year": 1986,
      "title": "Under the Cherry Moon",
      "studios": "Warner Bros.",
      "producers": ["Bob Cavallo", "Joe Ruffalo", "Steve Fargnoli"],
      "winner": true
    }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 2, "totalPages": 1 }
}
```

### `GET /health`

```json
{ "status": "ok", "movies": 206 }
```

### Erros

Parâmetros inválidos retornam `400`; rotas inexistentes retornam `404`. Um parâmetro que não existe
no contrato também é recusado, em vez de ignorado — `?yearr=1986` não devolve a lista inteira.

```json
{
  "error": {
    "message": "Invalid query parameters",
    "details": [{ "field": "limit", "message": "limit must be an integer between 1 and 100" }]
  }
}
```

## Contrato da API

[`openapi.yaml`](./openapi.yaml) (OpenAPI 3.0.3) descreve as três rotas, os parâmetros de query e
todos os payloads. Pode ser importado no Postman, Insomnia ou aberto no Swagger Editor para explorar
a API sem subir nada.

O arquivo não é documentação decorativa: `tests/integration/openapi-contract.test.ts` valida o
documento com `@apidevtools/swagger-parser` e confere cada resposta real contra o schema com `ajv`,
com `additionalProperties: false`. Campo a mais, campo a menos ou tipo trocado quebram a suíte.

## Regras de negócio

1. **Produtores** são extraídos da coluna `producers` separando por `,`, `and` e `&`
   (`"Bob Cavallo, Joe Ruffalo and Steve Fargnoli"` → três produtores).
2. Cada coprodutor recebe o prêmio individualmente — é o que faz Joel Silver somar 1990
   (`"Steven Perry and Joel Silver"`) e 1991 (`"Joel Silver"`).
3. Apenas filmes com `winner = yes` contam como prêmio; indicações são ignoradas.
4. Anos repetidos para o mesmo produtor são deduplicados — dois prêmios no mesmo ano não geram um
   intervalo de zero.
5. Produtores com um único prêmio não aparecem no resultado.
6. Os intervalos são sempre entre prêmios **consecutivos**, não entre o primeiro e o último.
7. `min` e `max` retornam todos os produtores empatados, ordenados por nome.
8. **Identidade do produtor** ignora caixa, acentos e espaços repetidos: `"José  Silva"`,
   `"JOSE SILVA"` e `"jose silva"` são o mesmo produtor. A grafia devolvida nas respostas é a
   primeira que apareceu no CSV, nunca a forma normalizada.

> **Limite conhecido da regra 1:** um nome creditado em conjunto também é dividido. O dataset
> fornecido tem uma linha assim — `"Sid and Marty Krofft and Jimmy Miller"` vira `Sid`,
> `Marty Krofft` e `Jimmy Miller`. Como o texto não distingue separador de nome, a divisão é
> mantida: é o comportamento correto nas outras 133 linhas que usam `and`, e o caso contrário
> (não dividir) descartaria metade dos produtores premiados. O comportamento está fixado por teste
> em `tests/unit/producer-parser.test.ts`.

## Testes

O desafio pede apenas testes de integração. Unitários e mutação entraram por decisão de projeto,
para cobrir o que o teste HTTP alcança só de forma indireta e para medir se as asserções realmente
pegam defeitos — não para substituir a camada exigida.

```bash
npm test                  # toda a suíte (unitários + integração)
npm run test:unit         # apenas unitários
npm run test:integration   # apenas integração
npm run test:coverage     # cobertura com threshold de 90%
npm run test:mutation     # teste de mutação (Stryker), threshold de 90%
npm run smoke             # sobe o dist/ compilado e valida os endpoints via HTTP real
```

Resultado da última execução local (reproduza com `npm run test:coverage` e
`npm run test:mutation`):

| Métrica                    | Resultado         |
| -------------------------- | ----------------- |
| Testes                     | 151 (19 arquivos) |
| Cobertura (linhas/funções) | 100%              |
| Cobertura (branches)       | 99,31%            |
| Mutation score             | 97,86%            |

- **Integração** sobe a aplicação real (Express + SQLite em memória) e valida as respostas HTTP, com
  o `Movielist.csv` fornecido e com datasets sintéticos: empates em `min` e `max`, produtor com um
  único prêmio, prêmios em anos não consecutivos, variação de caixa e acento no nome do produtor e
  parâmetro de query inexistente.
- **Regressão do dataset** (`tests/integration/dataset-regression.test.ts`) fixa os quatro
  produtores premiados mais de uma vez. Qualquer mudança nas regras de parsing ou de identidade
  aparece ali antes de mover a resposta de `/producers/intervals`.
- **Contrato** valida cada resposta contra os schemas de `openapi.yaml`, de modo que a documentação
  não pode divergir da API sem quebrar o build.
- **Smoke** cobre o que a suíte não alcança: executar o artefato compilado em `dist/` e conferir os
  endpoints por HTTP real, incluindo a resolução de `CSV_PATH` fora do runner de testes.
- **Mutação**: os oito mutantes sobreviventes foram analisados um a um e são equivalentes ou afetam
  apenas desempenho — por exemplo `router.get('/')` → `router.get('')`, que o Express resolve da
  mesma forma, e o cache de ids de produtores durante a ingestão, que evita idas ao banco sem mudar
  o resultado. Nenhum comentário de exclusão do Stryker foi usado.

## Arquitetura

```
.
├── data/Movielist.csv       # dataset de exemplo; troque apontando CSV_PATH
├── docs/architecture.md     # camadas, modelo de dados e fluxo de cada endpoint
├── docs/ai-interactions.md  # registro das interações com IA
├── openapi.yaml             # contrato da API, validado por teste de integração
├── scripts/smoke.sh         # executa o dist/ compilado e valida os endpoints
├── src/                     # código da aplicação
└── tests/                   # integração e unitários
```

```
src/
├── app.ts                  # composição do Express (middlewares + rotas)
├── server.ts               # ciclo de vida: ingestão do CSV, listen e shutdown
├── main.ts                 # entrypoint: ambiente, logger e sinais do SO
├── config/env.ts           # validação das variáveis de ambiente
├── csv/                    # parsing do CSV (sem dependência de HTTP ou banco)
├── database/               # schema SQLite e repositório
├── ingestion/              # carga do CSV para o banco
├── movies/                 # rota e validação de /movies
├── producers/              # intervalos, identidade do produtor e rota /producers
├── health/                 # rota /health
└── shared/                 # logger, erros HTTP e middlewares transversais
```

Fluxo de uma requisição em `/producers/intervals`: a rota pede ao repositório os anos premiados de
cada produtor com mais de um prêmio (uma única query SQL com CTE), e o domínio — uma função pura,
sem I/O — calcula os intervalos. Isso mantém a regra de negócio testável sem banco e o SQL
responsável apenas por filtrar e ordenar.

Diagramas das camadas, do modelo de dados e do fluxo de chamadas de cada endpoint estão em
[`docs/architecture.md`](./docs/architecture.md).

## Observabilidade

- Log estruturado JSON (pino) com `requestId`, método, rota, status e duração em milissegundos.
- O header `x-request-id` é aceito e ecoado; quando ausente, um UUID é gerado.
- `GET /health` expõe o estado da aplicação e quantos filmes foram carregados.

## Uso de IA

- [`AGENTS.md`](./AGENTS.md) — instruções do projeto para agentes de IA (padrões, comandos e
  limites).
- [`docs/ai-interactions.md`](./docs/ai-interactions.md) — registro das interações, decisões
  tomadas, o que foi questionado e o que foi descartado durante o desenvolvimento.

## Qualidade

```bash
npm run lint         # ESLint (typescript-eslint strictTypeChecked)
npm run format:check # Prettier em modo verificação
npm run typecheck    # tsc --noEmit
```

Hooks de Git (husky): `pre-commit` roda lint-staged; `pre-push` roda typecheck e a suíte de testes.
O workflow de CI (`.github/workflows/ci.yml`) executa lint, formatação, typecheck, build, smoke do
artefato compilado, cobertura e, em job separado, o teste de mutação.
