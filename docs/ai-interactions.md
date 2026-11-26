# Registro de interações com IA

Ferramenta: **Claude Code** (modelo Claude Opus 5), sessão única em 25/11/2026.
Formato: registro curado — prompts relevantes, decisões, divergências e código descartado.
As instruções permanentes dadas ao agente estão em [`AGENTS.md`](../AGENTS.md).

## 1. Prompt inicial

Pedido do autor, resumido a partir da conversa inicial:

> Precisamos escrever uma solução técnica: uma API RESTful que carregue a lista de indicados e
> vencedores da categoria Pior Filme do Golden Raspberry Awards em um banco de dados embarcado em
> memória e exponha o produtor com maior e com menor intervalo entre prêmios consecutivos.
> Precisamos garantir a qualidade do código, considerando princípios de Clean Code e Engenharia de
> Software, mas sem over-engineering. Apesar do documento de requisitos definir que devem ser
> implementados apenas testes de integração, acredito que seja válido a implementação de testes
> unitários e de mutação — vamos manter um percentual de pelo menos 90% de cobertura em ambos.

O agente leu o documento de requisitos fornecido junto ao pedido (não versionado aqui) e o
`Movielist.csv` antes de responder.

### Divergência registrada

O agente apontou dois riscos antes de iniciar:

1. Os requisitos dizem **"somente testes de integração"**. Testes unitários e de mutação vão além
   da letra do documento. Decisão tomada: manter integração como fonte de verdade da API e usar
   unitários apenas onde o teste HTTP é indireto demais (parser de CSV, cálculo de intervalos,
   validações).
2. Mutação a 90% em código de infraestrutura (bootstrap, logger, conexão) tende a produzir testes
   sem valor. Decisão tomada: `stryker.config.json` exclui `main.ts`, `server.ts`, `logger.ts` e
   `connection.ts` da mutação; o restante do código responde pelo threshold de 90%.

Ambos os pontos foram aceitos pelo autor do projeto.

## 2. Perguntas de clarificação (12, antes de qualquer linha de código)

| Pergunta                    | Decisão                                                             |
| --------------------------- | ------------------------------------------------------------------- |
| Stack                       | Express 5 + TypeScript (menos boilerplate que Nest para 2 rotas)    |
| Persistência                | `better-sqlite3` com SQL explícito, sem ORM                         |
| Arquitetura                 | Camadas simples: rota → repositório + domínio puro                  |
| Testes                      | Vitest + Supertest + Stryker                                        |
| Onde calcular os intervalos | SQL seleciona os anos premiados; domínio puro calcula os intervalos |
| Escopo de endpoints         | `/producers/intervals` + `/movies` (paginado) + `/health`           |
| Origem do CSV               | `CSV_PATH` configurável, com default no repositório                 |
| Registro de IA              | Este documento + `AGENTS.md`                                        |
| Observabilidade             | Logs estruturados + `/health` (sem OpenTelemetry)                   |
| Tooling                     | ESLint + Prettier + husky + GitHub Actions                          |
| Docker                      | Não incluir — SQLite em memória não justifica                       |
| Parsing de produtores       | Separadores `,`, `and` e `&`                                        |
| Empates em min/max          | Retornar todos os produtores empatados                              |
| Linha inválida no CSV       | Fail-fast: aborta a inicialização                                   |

## 3. Decisões técnicas durante a implementação

- **Query única com CTE** para os anos premiados de produtores com mais de um prêmio. O SQL filtra e
  deduplica; o cálculo dos intervalos fica em função pura, testável sem banco.
- **Deduplicação de anos** (`SELECT DISTINCT` + `Set` no domínio): dois prêmios do mesmo produtor no
  mesmo ano não podem gerar intervalo zero.
- **`PORT=0` aceito**: permite que o SO escolha uma porta efêmera, o que tornou possível testar
  `startServer` de verdade em vez de excluí-lo da cobertura.
- **`exactOptionalPropertyTypes`** ligado: o tipo de query params passou a ser derivado do schema zod
  (`z.infer`) em vez de duplicado à mão.
- **ESLint**: `tseslint.config()` está deprecado na versão instalada; migrado para `defineConfig`.
  Regras `no-unsafe-*` desligadas **apenas** em `tests/`, onde corpos de resposta HTTP e test doubles
  são naturalmente não tipados.

## 4. Código removido por evidência do teste de mutação

A primeira execução do Stryker ficou em **85,75%**. A análise dos mutantes sobreviventes revelou
código morto, que foi removido em vez de "testado":

| Código                                            | Por que saiu                                                                                           |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Remoção manual de BOM no parser                   | `String.prototype.trim()` já remove `U+FEFF`                                                           |
| `if (rows.length === 0) return []` no repositório | SQLite resolve `IN ()` sem erro; era guarda inútil                                                     |
| `if (intervals.length === 0)` no calculador       | `Math.min()`/`Math.max()` de lista vazia já produzem `{min:[],max:[]}`                                 |
| Desempate por `previousWin` no `sort`             | Inalcançável: `Array.sort` é estável e os intervalos de um mesmo produtor já saem em ordem cronológica |

Os demais mutantes viraram **testes novos** com asserções reais: mensagens de erro exatas, `cause`
preservada no erro de leitura do CSV, conteúdo do log de requisição (incluindo limites plausíveis
para `durationMs`), ausência do header `x-powered-by`, `name` das classes de erro, e todos os
valores aceitos em `LOG_LEVEL`/`NODE_ENV`.

Resultado final: **97,44%** de mutation score. Os nove sobreviventes restantes foram analisados
individualmente: são equivalentes (ex.: `router.get('/')` → `router.get('')`, que o Express trata da
mesma forma) ou afetam apenas desempenho (o cache de ids de produtores e o retorno antecipado para
páginas vazias). Nenhum comentário `// Stryker disable` foi usado para inflar a métrica.

## 5. O que foi deliberadamente descartado

| Descartado                  | Motivo                                                            |
| --------------------------- | ----------------------------------------------------------------- |
| NestJS                      | DI e módulos não pagam o próprio custo em duas rotas              |
| Clean Architecture completa | Use cases, ports e mappers seriam cerimônia sobre uma função pura |
| ORM (TypeORM/Prisma)        | Esconderia justamente o SQL que a solução deve demonstrar         |
| OpenTelemetry / Prometheus  | Desproporcional ao escopo; logs estruturados cobrem o requisito   |
| Docker                      | `npm ci && npm start` basta; banco é em memória                   |
| CRUD de filmes              | Fora do escopo definido nos requisitos                            |

## 6. Revisão final do próprio código

Na releitura de todos os arquivos, dois pontos no repositório foram corrigidos:

- a ingestão fazia dois statements por produtor (`INSERT ... DO NOTHING` seguido de `SELECT id`);
  virou um único `INSERT ... ON CONFLICT DO UPDATE ... RETURNING id` com cache em memória dos ids
  já resolvidos — relevante para volumes grandes de dados;
- o retorno antecipado para páginas vazias foi restaurado: sem ele o código dependia de o SQLite
  aceitar `IN ()`, um detalhe de implementação do SGBD.

## 7. Newman avaliado e recusado como camada de teste

Pergunta do autor: aplicar Newman/Postman para os testes de integração, como feito no projeto
`expense-tracker`. A recomendação do agente foi **não**, com três motivos concretos:

1. **Contexto diferente.** Lá o job do Newman sobe Postgres como service, roda migrations e espera a
   API ficar pronta — ele valida wiring de deploy. Aqui o banco é em memória, não há auth nem
   serviço externo, e `tests/integration/server.test.ts` já faz uma chamada HTTP real em porta
   efêmera.
2. **Duplicação de asserções.** As regras (empate, min/max, 400 em query inválida) passariam a
   existir em dois lugares com formatos diferentes, divergindo no primeiro refactor.
3. **Artefato pior para revisão.** Asserção de collection é JavaScript dentro de string JSON: sem
   tipo, sem lint e invisível para o Stryker — testes migrados para lá deixariam de matar mutantes.

A lacuna real que a pergunta expôs era outra: **o artefato compilado nunca era executado**. O CI
rodava `npm run build` e descartava o `dist/`. Se a resolução de `CSV_PATH` quebrasse no output
compilado, nada no pipeline apontaria o erro — ele apareceria só na primeira execução real.

Decisões tomadas a partir disso:

- `scripts/smoke.sh` executa `dist/main.js` e valida os endpoints por HTTP real; roda no CI dentro do
  job `quality` e localmente via `npm run smoke`.
- `openapi.yaml` na raiz entrega a quem consome a API o que a collection entregaria (importável no
  Postman e no Insomnia), com a vantagem de ser verificável: um teste de integração valida o
  documento e confere cada resposta contra os schemas, com `additionalProperties: false`.

## 8. Verificação final executada

```
npm run lint          → sem erros
npm run typecheck     → sem erros
npm test              → 132 testes, 17 arquivos, todos passando
npm run test:coverage → 100% linhas, 100% funções, 99,30% branches
npm run test:mutation → 97,44% (threshold 90%)
npm run smoke         → smoke: ok (dist/ compilado, endpoints por HTTP real)
```

Além disso, a API compilada foi executada e validada manualmente via `curl`
(`/producers/intervals`, `/movies`, `/health` e um caso de erro 400).

## 9. Council de revisão e os defeitos que ele encontrou

Antes de fechar a entrega, a solução passou por uma revisão multiperspectiva com seis avaliadores
independentes (pragmático, cético, arquiteto, advogado do usuário, advogado do diabo e estrategista),
seguida de uma rodada em que cada um revisou a posição de outro. **Nenhuma alegação foi aceita sem
reprodução:** cada achado abaixo foi confirmado rodando o código antes de virar correção.

| Achado                                                            | Verificação                                                | Correção                                                   |
| ----------------------------------------------------------------- | ---------------------------------------------------------- | ---------------------------------------------------------- |
| Métricas do README divergiam de `docs/ai-interactions.md`         | coverage e Stryker executados: 99,31% e 97,86%             | README corrigido; passou a citar a execução real           |
| Exemplo de `/movies` mostrava um id inexistente                   | `curl` documentado devolve os ids 36 e 37                  | exemplo substituído pela resposta real, com os dois filmes |
| Corpo JSON malformado devolvia 500                                | reproduzido em `GET` e `POST`                              | `express.json()` removido: a API não tem rota de escrita   |
| `?yearr=1986` respondia 200 com a lista inteira                   | reproduzido                                                | `.strict()` no schema de query, com teste                  |
| Variação de caixa no nome do produtor zerava `min`/`max`          | CSV sintético com `di`/`Di` devolvia `{"min":[],"max":[]}` | chave de identidade normalizada na ingestão                |
| Mensagem de erro vazava o texto interno do zod                    | `?page=abc` → `"expected number, received NaN"`            | mensagem por campo, exaustiva em tempo de compilação       |
| `openapi.yaml` admitia `interval: 0`, impossível na implementação | regra 3 do README já decidia o contrário                   | `minimum: 1` no contrato                                   |

### O que foi recusado, e por quê

- **Remover `and` da separação de produtores.** Medido: 133 das 206 linhas usam `and` como
  separador; sem ele, os produtores vencedores caem de 94 para 70, os com dois prêmios caem de 4
  para 2 e `min` muda de Joel Silver (1 ano) para Bo Derek (6). O prêmio de 1990 de Joel Silver vem
  justamente de `"Steven Perry and Joel Silver"`.
- **Propagar sobrenome em `"Sid and Marty Krofft"`.** Consertaria o único caso do dataset, mas
  produziria `"Madonna Penn"` a partir de `"Madonna and Sean Penn"`. Erro visível (`Sid`,
  claramente incompleto) é preferível a erro plausível.
- **Dockerfile.** `npm ci && npm start` resolve; o banco é em memória.

### O teste que não testava nada

O caso `"Alexander Sandro"` prometia cobrir "nomes que contêm `and`", mas a regra usa fronteira de
palavra: "Alexander" jamais poderia ser dividido, então o teste não podia falhar. Foi renomeado para
o que de fato verifica e acompanhado de um teste que assere o comportamento **errado** de propósito
(`"Sid and Marty Krofft"` → `Sid`, `Marty Krofft`), para que qualquer mudança futura na regra quebre
a suíte conscientemente. No mesmo movimento entrou `tests/integration/dataset-regression.test.ts`,
que fixa os quatro produtores com dois prêmios do dataset fornecido.

## 10. Verificação após as correções

```
npm run lint          → sem erros
npm run typecheck     → sem erros
npm test              → 151 testes, 19 arquivos, todos passando
npm run test:coverage → 100% linhas, 100% funções, 99,31% branches (ver seção 11)
npm run test:mutation → 97,86% (threshold 90%), 8 sobreviventes equivalentes
npm run smoke         → smoke: ok
```

## 11. Defeito encontrado na validação manual

Ao subir a API para validar os endpoints no Postman, o processo registrava `api listening` e morria
em seguida, **sem erro e com código de saída 0**. A porta 3000 estava ocupada por um container de
outro projeto.

Causa: `listen()` resolvia a promise no evento `listening` e registrava o handler de erro com
`once`, consumido pela própria promise. Num bind dual-stack o socket IPv6 sobe, dispara `listening`,
e o `EADDRINUSE` do lado IPv4 chega **depois** — com a promise já resolvida, `reject` virava no-op,
o erro era engolido e o processo saía limpo como se a API estivesse no ar.

Correção em `src/server.ts`: o handler de erro passou a ser permanente. Depois que o servidor está
escutando, um erro vira log `fatal` e `process.exitCode = 1`; antes disso, continua rejeitando a
inicialização. O log `api listening` também passou a depender de `server.listening`: anunciar uma
porta que já não atende era justamente a linha que induzia ao erro.

Dois testes entraram junto. O primeiro ocupa uma porta e tenta subir outra instância nela,
aceitando tanto rejeição quanto erro tardio — o que não se aceita é silêncio. O segundo emite o erro
no servidor já aberto e exige o log `fatal` e o código de saída. Sem a correção, o primeiro passa em
silêncio e o segundo falha.

```
npm test              → 153 testes, 19 arquivos
npm run test:coverage → 100% linhas, 100% funções, 100% branches
npm run test:mutation → 97,86% (threshold 90)
```

## 12. Revisão final contra datasets diferentes

Os requisitos avisam que outros conjuntos de dados serão usados. Para medir isso em vez de
supor, foram gerados 30 CSVs de borda e dois de volume (10 mil e 100 mil linhas), todos fora do
repositório, e cada um foi carregado pelo pipeline real.

Passaram sem ajuste: delimitador `,` e tabulação, CRLF, BOM, header em maiúsculas, linhas em branco,
espaços extras, aspas escapadas, `winner` em várias grafias, prêmios repetidos no mesmo ano,
produtor repetido na célula, três grafias do mesmo nome, 100 produtores numa célula, empate com 20
produtores em cada extremo, dataset sem vencedores e dataset de um filme só.

Volume, com 100 mil linhas: parse 218 ms, ingestão 833 ms, query dos produtores premiados 106 ms,
página de 20 filmes em 1,6 ms. Via HTTP, `/movies?page=4000` respondeu em 31 ms.

### Cinco correções

| Achado                      | Antes                                  | Depois                          |
| --------------------------- | -------------------------------------- | ------------------------------- |
| Ordem das colunas diferente | `Invalid header`, API não sobe         | colunas mapeadas pelo nome      |
| Coluna extra (`country`)    | `Invalid header`, API não sobe         | ignorada, com aviso no log      |
| `winner` igual a `1` ou `0` | `Invalid winner "1"`                   | aceitos                         |
| Arquivo em ISO-8859-1       | carregava texto corrompido, status 200 | erro explícito na inicialização |
| Título vazio                | abortava o dataset inteiro             | aviso no log, dataset usado     |

A escolha de fundo: **rigor só onde existe regra de negócio**. `year`, `producers` e `winner` são
obrigatórios e qualquer inconsistência neles aborta a carga; `title` e `studios` não participam de
nenhuma regra, então ausência, vazio ou coluna a mais viram `ParsedCsv.warnings`, que a ingestão
registra como `warn` com a linha e a contagem de ocorrências. Nenhum log por linha repetida: os
avisos são agregados por mensagem.

Na mesma rodada, dois mutantes sobreviventes novos foram tratados na origem: o ternário
`index === undefined ? '' : fields[index]` era equivalente, porque `header.indexOf` já devolve `-1` e
`fields[-1]` lê como célula vazia — a condição foi removida em vez de testada; e o contexto do log de
aviso passou a ser verificado no teste, não só a mensagem.

```
npm test              → 160 testes, 19 arquivos
npm run test:coverage → 100% linhas, 100% funções, 100% branches
npm run test:mutation → 98,37% (era 97,86%)
```

## 13. Auditoria de boas práticas de Node

Antes de abrir a frente de frontend, a API passou por uma auditoria focada em práticas consolidadas
de Node e TypeScript. O achado mais grave foi reproduzido antes de virar correção:

```
npm ci --omit=dev && node dist/main.js
→ Error: unable to determine transport target for "pino-pretty"
```

`NODE_ENV` tinha default `development`, o que liga o transport `pino-pretty` — que é
`devDependency`. Qualquer instalação de produção morria na primeira linha de log, e o CI nunca
pegaria porque instala tudo. A correção escolhida foi inverter o default para `production` e deixar
`npm run dev` declarar `development`: default inseguro era a causa, mover a dependência seria tratar
o sintoma.

Como o projeto é executado localmente, e não implantado, os achados puramente de
produção foram descartados de propósito: `helmet`, timeouts de socket, `/health/live` versus
`/health/ready`, limite superior de `page`, validação de tamanho do `x-request-id` e `permissions`
no workflow. Ficaram os que afetam quem roda local ou quem lê o código.

### Aplicado

| Correção                                                             | Motivo                                                                                        |
| -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `NODE_ENV` com default `production` e `dev` declarando `development` | instalação sem devDependencies voltou a subir                                                 |
| `--env-file-if-exists=.env` em `start` e `dev`                       | `.env.example` era citado no README e nada lia `.env`                                         |
| `.nvmrc` e `packageManager`                                          | quem clona passa a ter a versão de Node declarada                                             |
| `@types/node` alinhado ao `engines` (22)                             | tipava APIs que o runtime não tem                                                             |
| `"private": true`                                                    | evita publicação acidental                                                                    |
| Shutdown com `catch`, deadline de 10 s e `closeIdleConnections()`    | `Ctrl+C` deixa de depender de keep-alive e falha de close deixa de virar rejeição não tratada |
| `uncaughtException` e `unhandledRejection` logados e com saída 1     | a falha final para de sair como stack cru fora do log estruturado                             |
| `requestId` na linha de erro do 500                                  | correlaciona as duas pontas da mesma requisição                                               |
| Requisição abortada passa a gerar log (`aborted: true`)              | antes, cliente que desistia não deixava rastro                                                |
| `smoke.sh` manda `SIGTERM` e exige saída 0                           | o caminho de shutdown não era verificado por teste nenhum                                     |
| Thresholds para 100% de cobertura e 95% de mutação                   | a folga de 8 pontos escondia regressão silenciosa                                             |

### Recusado, com motivo

A auditoria pedia guardas de `undefined` nos retornos do driver (`as { id: number }`). Recusado:
`SELECT COUNT(*)` e `INSERT ... RETURNING id` sempre produzem linha, então a guarda seria código
inalcançável — exatamente o que o teste de mutação nos fez apagar na seção 4. Também foi recusada a
alegação de perda de log no `process.exit`: testado nos dois modos de logger, a linha
`shutting down` é gravada.

```
npm test              → 162 testes, 20 arquivos
npm run test:coverage → 100% em linhas, funções, branches e statements
npm run test:mutation → 98,19% (threshold 95)
npm run smoke         → smoke: ok, com shutdown verificado
```
