# Dashboard

Angular 22 consumindo a API deste repositório. Duas telas: intervalos de premiação e listagem de
filmes.

```bash
npm start           # http://localhost:4200 (proxy de /api para http://localhost:3000)
npm test            # Vitest
npm run test:coverage
npm run lint
npm run build
```

A API precisa estar no ar; o dashboard não tem dados próprios.

## Decisões

**Zoneless e signals.** O app não carrega `zone.js`. Estado é signal, dados vêm de `httpResource` e
todo componente é `OnPush`. Nenhum `subscribe` manual, nenhum `async` pipe.

**`httpResource` em vez de serviço com `BehaviorSubject`.** A API é somente leitura, então cada
recurso é uma consulta declarativa que reage a signals: mudar o filtro refaz a requisição sem
nenhum código imperativo (`MoviesApi.movies` recebe o signal de filtros).

**`hasValue()` antes de `value()`.** `resource.value()` lança enquanto o recurso está em erro — foi
um teste que mostrou isso, com o indicador de saúde quebrando exatamente quando a API caía. Toda
leitura passa por `hasValue()`.

**Guarda de forma antes do template.** `hasValue()` garante que há valor, não que o valor tem o
formato esperado. Um `200` com corpo fora do contrato chegava ao template e lançava dentro de um
`computed`, congelando a página no estado de carregamento com a exceção apenas no console. As
funções de `core/movie-guards.ts` estreitam a partir de `unknown` e transformam isso em estado de
erro visível. A API é validada por contract test do lado dela; o painel não assume que o que chegou
é o que foi combinado.

**Um recurso de saúde compartilhado, não uma fábrica.** `MoviesApi.health` é um campo, então uma
requisição serve a rota inteira e um `reload()` atualiza o indicador em todo lugar. Como fábrica,
cada consumidor criava o seu: `/health` era pedido duas vezes por rota e o badge ficava "API fora"
para sempre depois que a API voltava, porque o retry só recarregava o recurso da página.

**Teto na lista de empates.** A API devolve todos os produtores empatados, e isso é regra de
negócio. A UI mostra os dez primeiros mais a contagem do que ficou de fora: com um dataset sintético
de 100 mil linhas foram 14.612 empatados, que renderizados por inteiro produziam um DOM de 2,88 MB.

**Entrada numérica recusada no cliente.** O campo de ano é `type="number"` com faixa e o handler
exige dígitos. Antes, letras viravam `NaN` e iam para a API como `?year=NaN`, que voltava 400.

**Paginação e filtros no servidor.** A tabela nunca recebe a coleção inteira: `page`, `limit`,
`year` e `winner` vão como query params e o total vem do `pagination` da resposta.

**Mensagem de erro da API, não genérica.** A API responde `{ error: { message, details } }`, então
o painel de erro mostra o motivo real — inclusive o nome do parâmetro recusado.

**Tailwind sem biblioteca de componentes.** Os tokens de cor e tipografia ficam em `src/styles.css`
como `@theme`; os componentes são próprios e pequenos. Há um token separado para texto sobre fundo
tingido (`--color-brand-ink`): o tom de destaque não alcança 4,5:1 de contraste em texto de 12px, o
que o axe-core apontou no badge de vencedor.

**TestBed sem Testing Library.** A versão atual da Testing Library para Angular ainda não cobre a 22,
e o TestBed com `fixture.whenStable()` já cobre o que importa aqui.

## Testes

39 testes em 7 arquivos. `HttpTestingController` com o padrão flush-primeiro: em modo zoneless,
`whenStable()` só resolve depois que a requisição pendente é respondida. Criar o componente,
`detectChanges()`, responder a requisição e só então aguardar.

Como o recurso de saúde é compartilhado, **toda** página dispara `GET /health` ao ser criada: o
teste precisa respondê-lo no `beforeEach`, ou trava em timeout.

Thresholds de cobertura em 90% vivem em `vitest-base.config.mts`, carregado pelo builder via
`angular.json` — o builder não tem flag de threshold, e threshold que ninguém aplica é pior que
nenhum.
