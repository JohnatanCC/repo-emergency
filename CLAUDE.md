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
  O lado de fora (caminhão, jardim, fachada) é gerado para todos os níveis em `levels/exterior.ts` a partir do
  "carro" e da sala encostada nele; não desenhe isso nos níveis.
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
  - `sombra` estado da (primeira) Sombra — há níveis com duas; `allCreatures()` lista todas (`state`, `lit` = no feixe, `pos`, `path`, `unsticks`, `tp(x, z)`)
  - `possessor` (`carrying`, `freed` = figuras soltas, `ghostState`, `ghostPos`); o item possuído tem `possessed: true`
    no store de itens (`items.getState().pickUp/drop` liberta a figura)
  - `coisa.list` as COISAS em cena (`id`, `state`, `x`, `z`); morrer (`player.getState().damage(100)`) cria uma
  - Cuidado com a geometria nos testes de perseguição: mesas e móveis travam o jogador; prefira corredores retos
    (ex.: corredor sul do nível 1, z ≈ 10, x de 1 a 23). O jogo começa no caminhão (x ≈ −33,5 no nível 1);
    a porta da frente da casa fica em x ≈ −7
  - loja/ferramentas: `game.getState().buy(id)`, `useTool()` usa a ferramenta do espaço escolhido (`items.getState().select(i)`);
    `allCreatures()` em `src/game/systems/creatures.ts` dá `pos()` e `stun()` de cada criatura
  - Para testar a IA, rode testes longos (minutos) **sem** barulhos artificiais: barulhos dão destinos novos e
    escondem travamentos. A ferramenta corta scripts com mais de 45 s: rode em segundo plano e leia depois.
  - `play()` também passa da tela de título. Marcadores (`G`) e painel (`H`) começam desligados.
  - modelos das criaturas: `/?galeria`. A captura de tela do painel pode vir preta ou atrasada no WebGL;
    copie o quadro para um `<img>` (`canvas.toDataURL()`, a galeria usa `preserveDrawingBuffer`) e capture a imagem.
  - mapa: Tab (`window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Tab' }))`); objetos vistos em
    `mapInfo.seen` (`src/game/systems/mapInfo.ts`); na mira: `aimTarget.id` (`src/game/systems/aim.ts`)
  - depois de editar um arquivo, o HMR pode trocar o `debugApi` e `window.__relicario` ficar com o antigo
    (ex.: `stats()` devolve {}): recarregue a página
  - desempenho: `stats()` desenha um quadro e devolve draw calls, triângulos, luzes e tempo
  - imagem do jogo: `await tick(100)` e depois `document.querySelector('canvas').toDataURL()` num `<img>`
    (em dev o canvas preserva o quadro). A captura de tela às vezes mostra o quadro anterior: capture duas vezes.
  - jumpscare: `player.getState().scare('guardia' | 'sombra' | 'possessor')`; o Canvas dele só monta com o painel
    rodando quadros (a 0 fps fica em 300×150 e preto)
  - forçar a fase: `game.getState().setPhase('hunted')` faz as entidades aparecerem. Criaturas com `delay` contam a
    partir de `enemyTimerStart + enemyDelay`: para vê-las, `game.setState({ enemyTimerStart: performance.now() - ms })`
  - caçadoras (`damage`/`lockTime`/`chaseMusic` no ponto de nascimento, ex.: Hospital): `isChased()` em
    `src/game/systems/chase.ts` diz se a música de perseguição está tocando
  - possessão: `player.getState().possess(segundos)`; bote da Guardiã: `pose.attack` sobe durante `GUARDIA.windup`
  - Espectro (níveis 4 e 5): `espectro.state`/`pos`/`tp(x, z)`; jumpscare com `player.getState().scare('espectro')` (5 s encarando)
  - galeria de uma criatura só: `/?galeria=espectro` (guardia, sombra, possessor, coisa, espectro)
  - renascimento: `player.getState().startRevive()` / `endRevive()`; avance com `tick` (a cena usa o tempo do jogo)
  - `game` / `player` / `items` / `hiding` são os stores Zustand (ex.: `items.getState().pickUp(uid)`)
- Se o Vite servir um módulo vazio depois de várias edições seguidas (erro "does not provide an export"),
  reinicie o servidor (`preview_stop` + `preview_start`).
- O painel do navegador oculto pausa os frames (0 fps). `tick(ms)` avança o jogo à mão (`hold` já usa);
  use `await tick(…)` no lugar de `setTimeout` quando o teste precisa que o tempo passe no jogo.
