# Relicário — guia para o Claude

Jogo de terror singleplayer de investigação paranormal (React Three Fiber + Rapier + Zustand).
Conceito, mecânicas e ordem das versões: `ROADMAP.md`. Histórico: `CHANGELOG.md`.

## Regras do projeto
- Jogo **original**. Não copiar mecânicas-assinatura, nomes, sons ou assets de outros jogos (o projeto já foi uma reimaginação do R.E.P.O. e deixou de ser).
- Sons só próprios ou de licença livre, com crédito no README.
- Código, comentários, UI e commits em **português**. Comentários curtos explicando o porquê.
- Uma versão do ROADMAP por vez. Ao fechar: `version` no `package.json`, `VERSION_NAME` em `src/game/version.ts`, entrada no `CHANGELOG.md`, marcar ✅ no ROADMAP.
- Números de gameplay em arquivos de config (`src/player/config.ts`…), não espalhados na lógica.

## Arquitetura
- `src/game/data/` — níveis como dados (planta 2D, 1 u = 0,08 m). `buildLevel.ts` transforma em greybox.
  Níveis novos usam `room()`/`link()` (`levels/plan.ts`). Ao criar ou mudar um mapa, valide com a grade de navegação
  (`buildNavGrid` + `findPath` do carro até cada sala, item, criatura e armário) antes de testar jogando.
  Trocar de nível no teste: `game.setState({ levelIndex: n })` + `game.getState().restart()` + `player.getState().respawn()`.
- `src/game/stores/gameStore.ts` — fase, vidas, debug. `src/player/playerStore.ts` — vida/estamina/HUD (muda todo frame; só o HUD assina).
- `src/game/physics.ts` — grupos de colisão. O mundo fixo é `WORLD`; portas não colidem com o mundo.
- `src/game/systems/` — sistemas sem React (ruído, interação).
- Estado que muda todo frame fica em `useRef`/objetos mutáveis, não em estado React.
- Física: `timeStep="vary"`; movimento do player roda em `useBeforePhysicsStep`.

## Verificação
- `npx tsc -b` e `npx prettier --check src` antes de fechar qualquer mudança.
- Testar no navegador com `preview_start` (config `dev` em `.claude/launch.json`).
- O pointer lock não funciona no navegador automatizado. Em dev existe `window.__relicario`:
  - `play()` simula o mouse travado · `look(yawGraus, pitchGraus)` gira a câmera · `pos()` posição dos pés
  - `hold('KeyW', ms)` segura uma tecla · `press('KeyE')` aperta · `tp(x, z)` teleporta (coordenadas do mundo)
  - `aim()` o que a mira acertou (distância, se é interagível)
  - `guardia` estado da Guardiã (`state`, `seeing`, `sight` = motivo de ver/não ver, `pos`, `path`, `unsticks`);
    `guardia.tp(x, z)` teleporta e `guardia.goTo(x, z)` manda investigar um ponto (reproduzir casos)
  - `sombra` estado da Sombra (`state`, `lit` = no feixe, `pos`, `path`, `unsticks`, `tp(x, z)`)
  - `possessor` (`carrying`, `freed` = figuras soltas, `ghostState`, `ghostPos`); o item possuído tem `possessed: true`
    no store de itens (`items.getState().pickUp/drop` liberta a figura)
  - `coisa.list` as COISAS em cena (`id`, `state`, `x`, `z`); morrer (`player.getState().damage(100)`) cria uma
  - Cuidado com a geometria nos testes de perseguição: mesas e móveis travam o jogador; prefira corredores retos
    (ex.: corredor sul, z ≈ 10, x de −11 a 11)
  - loja/ferramentas: `game.getState().buy(id)`, `useTool()` usa a ferramenta do espaço escolhido (`items.getState().select(i)`);
    `allCreatures()` em `src/game/systems/creatures.ts` dá `pos()` e `stun()` de cada criatura
  - Para testar a IA, rode testes longos (minutos) **sem** barulhos artificiais: barulhos dão destinos novos e
    escondem travamentos. A ferramenta corta scripts com mais de 45 s: rode em segundo plano e leia depois.
  - forçar a fase: `game.getState().setPhase('hunted')` faz as entidades aparecerem
  - `game` / `player` / `items` / `hiding` são os stores Zustand (ex.: `items.getState().pickUp(uid)`)
- Se o Vite servir um módulo vazio depois de várias edições seguidas (erro "does not provide an export"),
  reinicie o servidor (`preview_stop` + `preview_start`).
- O painel do navegador oculto pausa os frames (0 fps). `tick(ms)` avança o jogo à mão (`hold` já usa);
  use `await tick(…)` no lugar de `setTimeout` quando o teste precisa que o tempo passe no jogo.
