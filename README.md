# Golden Raspberry Awards — API e dashboard

Monorepo com a API do desafio e um dashboard Angular que a consome. A entrega do desafio é a API,
que vive sozinha na branch `main`; esta branch acrescenta o frontend para demonstrar o conjunto
fullstack.

[![CI](https://github.com/bdfdm25/golden-raspberry-api/actions/workflows/ci.yml/badge.svg)](https://github.com/bdfdm25/golden-raspberry-api/actions/workflows/ci.yml)

```
apps/
├── api/   API RESTful (Node 22, Express 5, SQLite em memória) — ver apps/api/README.md
└── web/   Dashboard (Angular 22, zoneless, signals, Tailwind) — ver apps/web/README.md
```

## Rodar tudo com Docker

```bash
docker compose up --build
```

- Dashboard: http://localhost:8080
- API: http://localhost:3000

O container do dashboard é um nginx que serve o bundle e encaminha `/api` para o container da API.
A API **não** envia cabeçalhos CORS de propósito: o navegador só fala com uma origem, tanto no
container quanto no servidor de desenvolvimento.

## Rodar sem Docker

Pré-requisitos: Node.js 22.9 ou superior (veja `.nvmrc`) e npm 10+.

```bash
npm ci            # instala os dois apps (npm workspaces)
npm run dev:api   # API em http://localhost:3000
npm run dev:web   # dashboard em http://localhost:4200, com proxy de /api para a API
```

Os dois precisam estar no ar: o dashboard não tem dados próprios.

## Qualidade

| Comando             | O que faz                      |
| ------------------- | ------------------------------ |
| `npm test`          | suíte dos dois apps            |
| `npm run lint`      | ESLint nos dois apps           |
| `npm run typecheck` | TypeScript nos dois apps       |
| `npm run build`     | build dos dois apps            |
| `npm run format`    | Prettier em todo o repositório |

Métricas da última execução local:

| App   | Testes             | Cobertura                                         | Mutação |
| ----- | ------------------ | ------------------------------------------------- | ------- |
| `api` | 162 em 20 arquivos | 100% em linhas, funções, branches e statements    | 98,19%  |
| `web` | 34 em 7 arquivos   | 98,7% statements · 96,6% branches · 95,9% funções | —       |

O CI roda quatro jobs: `api`, `web`, `mutation` e `stack`, sendo o último um smoke do
`docker compose` conferindo que o dashboard é servido e que o proxy alcança a API.

## Documentação

- [`apps/api/README.md`](./apps/api/README.md) — endpoints, formato do CSV e regras de negócio
- [`apps/web/README.md`](./apps/web/README.md) — decisões do frontend
- [`docs/architecture.md`](./docs/architecture.md) — camadas, modelo de dados e fluxo por endpoint
- [`docs/ai-interactions.md`](./docs/ai-interactions.md) — registro das interações com IA
- [`AGENTS.md`](./AGENTS.md) — instruções para agentes de IA que trabalhem neste repositório
