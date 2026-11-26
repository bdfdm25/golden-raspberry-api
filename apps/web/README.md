# Dashboard

Angular 22 consumindo a API do desafio. Duas telas: intervalos de premiação e listagem de filmes.

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

**Paginação e filtros no servidor.** A tabela nunca recebe a coleção inteira: `page`, `limit`,
`year` e `winner` vão como query params e o total vem do `pagination` da resposta.

**Mensagem de erro da API, não genérica.** A API responde `{ error: { message, details } }`, então
o painel de erro mostra o motivo real — inclusive o nome do parâmetro recusado.

**Tailwind sem biblioteca de componentes.** Os tokens de cor e tipografia ficam em `src/styles.css`
como `@theme`; os componentes são próprios e pequenos.

**TestBed sem Testing Library.** A versão atual da Testing Library para Angular ainda não cobre a 22,
e o TestBed com `fixture.whenStable()` já cobre o que importa aqui.

## Testes

`HttpTestingController` com o padrão flush-primeiro: em modo zoneless, `whenStable()` só resolve
depois que a requisição pendente é respondida. Criar o componente, `detectChanges()`, responder a
requisição e só então aguardar.

Thresholds de cobertura em 90% vivem em `vitest-base.config.mts`, carregado pelo builder via
`angular.json` — o builder não tem flag de threshold, e threshold que ninguém aplica é pior que
nenhum.
