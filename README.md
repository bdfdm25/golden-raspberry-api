# Golden Raspberry Awards API

API RESTful que lê a lista de indicados e vencedores da categoria **Pior Filme** do Golden Raspberry
Awards a partir de um arquivo CSV, carrega os dados em um banco em memória na inicialização e expõe
os intervalos entre prêmios consecutivos de cada produtor.

## Stack

| Item      | Escolha                              | Motivo                                                    |
| --------- | ------------------------------------ | --------------------------------------------------------- |
| Runtime   | Node.js 20+ / TypeScript             | `strict` + `exactOptionalPropertyTypes` ligados.          |
| HTTP      | Express 5                            | Nível 2 de Richardson sem camadas desnecessárias.         |
| Banco     | SQLite em memória (`better-sqlite3`) | SGBD embarcado, zero instalação externa.                  |
| Validação | zod                                  | Validação de ambiente e de query params em um só lugar.   |
| Logs      | pino                                 | Log estruturado com `requestId` e duração por requisição. |
| Testes    | Vitest + Supertest                   | Integração (requisito) e unitários do domínio.            |
| Mutação   | Stryker                              | Mede se os testes realmente detectam defeitos.            |

## Como rodar

Pré-requisitos: Node.js 20 ou superior (testado no Node 25) e npm.

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

## Testes

```bash
npm test              # toda a suíte (unitários + integração)
npm run test:unit     # apenas unitários
npm run test:integration  # apenas integração
npm run test:coverage # cobertura com threshold de 90%
npm run test:mutation # teste de mutação (Stryker), threshold de 90%
npm run smoke         # sobe o dist/ compilado e valida os endpoints via HTTP real
```

Resultado da última execução local:

| Métrica                    | Resultado         |
| -------------------------- | ----------------- |
| Testes                     | 132 (17 arquivos) |
| Cobertura (linhas/funções) | 100%              |
| Cobertura (branches)       | 99,27%            |
| Mutation score             | 98,54%            |

Os testes de integração sobem a aplicação real (Express + SQLite) e validam as respostas HTTP —
inclusive com o `Movielist.csv` fornecido e com datasets sintéticos que cobrem empates, produtores
com um único prêmio e produtores com prêmios em anos não consecutivos. Um deles valida cada resposta
contra os schemas de [`openapi.yaml`](./openapi.yaml), de modo que a documentação não pode divergir
da API sem quebrar o build. O `npm run smoke` cobre o que os testes não alcançam: executar o
artefato compilado em `dist/` e conferir os endpoints por HTTP real. Os nove mutantes sobreviventes
restantes foram analisados um a um e são equivalentes ou afetam apenas desempenho — por exemplo
`router.get('/')` → `router.get('')`, que o Express resolve da mesma forma, e o cache de ids de
produtores durante a ingestão, que evita idas ao banco sem mudar o resultado.

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
      "id": 25,
      "year": 1986,
      "title": "Howard the Duck",
      "studios": "Universal Studios",
      "producers": ["Gloria Katz"],
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

Parâmetros inválidos retornam `400`; rotas inexistentes retornam `404`. Formato:

```json
{
  "error": {
    "message": "Invalid query parameters",
    "details": [{ "field": "limit", "message": "Too big: expected number to be <=100" }]
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
2. Apenas filmes com `winner = yes` contam como prêmio; indicações são ignoradas.
3. Anos repetidos para o mesmo produtor são deduplicados — dois prêmios no mesmo ano não geram um
   intervalo de zero.
4. Produtores com um único prêmio não aparecem no resultado.
5. Os intervalos são sempre entre prêmios **consecutivos**, não entre o primeiro e o último.
6. `min` e `max` retornam todos os produtores empatados, ordenados por nome.

## Arquitetura

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
├── producers/              # cálculo de intervalos e rota /producers
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

- [`AGENTS.md`](./AGENTS.md) — instruções do projeto para agentes de IA (padrões, comandos, limites).
- [`docs/ai-interactions.md`](./docs/ai-interactions.md) — registro das interações, decisões tomadas,
  o que foi questionado e o que foi descartado durante o desenvolvimento.

## Qualidade

```bash
npm run lint        # ESLint (typescript-eslint strictTypeChecked)
npm run format      # Prettier
npm run typecheck   # tsc --noEmit
```

Hooks de Git (husky): `pre-commit` roda lint-staged; `pre-push` roda typecheck e a suíte de testes.
O workflow de CI (`.github/workflows/ci.yml`) executa lint, typecheck, build, cobertura e mutação.
