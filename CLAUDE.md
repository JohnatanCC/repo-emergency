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
  - `game` / `player` / `items` são os stores Zustand (ex.: `items.getState().pickUp(uid)`)
- O painel do navegador oculto pausa os frames (0 fps): mostre-o com `show_pane` antes de testar.
