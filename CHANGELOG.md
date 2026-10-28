# Changelog

## 0.5.0 — Ruído e áudio · 2026-10-28

### Adicionado
- Sons gerados por código (`src/game/audio/synth.ts`): passos por piso, rangido e batida de porta, impacto, estilhaço, farfalhar, clique, ambiência, zumbido, carga e extração do extrator, batimento. Podem ser trocados por arquivos em `SOUND_FILES`.
- Motor de áudio 3D (`src/game/audio/engine.ts`) com HRTF, loops e mudo (`M`); ouvinte e ambiência no `AudioDirector`.
- Passos com som e ruído conforme o andar (agachado/andando/correndo) e o piso da sala (`roomAt` no `buildLevel`).
- Sons em portas, itens (frágeis estilhaçam), lanterna, pegar item e extrator.
- Ambiência que muda com a fase, rangidos distantes e batimento cardíaco ligado ao nível de perigo (`src/game/systems/danger.ts`).
- Debug: anéis de ruído (`G`) e `tick(ms)` em `window.__relicario`, que avança os frames à mão para testar com o painel oculto.
- Ambiência de dentro e de fora: vento forte lá fora e abafado na casa, trovões distantes, e sons por sala definidos nos dados (`ambient`: relógio no Salão, goteira no Banheiro, grilos no Pátio).
- Agachar também com `Ctrl`; atalhos do navegador com `Ctrl` ficam bloqueados enquanto o mouse está travado (menos `Ctrl+W/T/N`).

### Alterado
- Portas viram física livre (só atrito): abrem ao encostar o corpo, itens ou, no futuro, entidades. `E` continua abrindo/fechando e depois a porta volta a ficar solta.
- O investigador tem massa (70 kg) para empurrar portas e itens.
- Iluminação: lâmpadas 38% mais fracas e uma luz de fundo azulada (céu/chão) no lugar da ambiente quase zero. Fica mais escuro, mas nunca preto total: sem lanterna ainda dá para ver os contornos. Números em `LIGHTING` (`src/game/config.ts`).
- Testador de som do painel lista os sons do jogo.

## 0.4.0 — Extrator e contrato · 2026-10-28

### Adicionado
- Extrator mágico (`src/world/Extractor.tsx`): conta o que está largado na sala roxa; com relíquias inteiras suficientes para a meta, carrega 5 s (luz pulsando) e leva tudo de uma vez. Tirar uma relíquia cancela a carga.
- Apagão depois da extração e volta ao carro (`src/world/LevelFlow.tsx`), que leva à tela de pagamento.
- Tela de resultado: relíquias pagas pelo C.R.O.S + saque vendido, saldo acumulado; `Enter` começa o próximo contrato (itens sorteados de novo, portas fechadas, vidas cheias).
- Painel do carro com tela retrô (`src/world/CarPanel.tsx`): meta, o que já está no extrator e saldo.
- HUD: contagem do extrator, aviso de carga e de apagão.
- `src/game/config.ts` (números da extração) e `src/player/playerPos.ts` (posição do jogador para os sistemas).

### Alterado
- O investigador fica parado nas telas de resultado e de fim de jogo.
- A luz roxa do extrator saiu de `RoomLights` e passou para o `Extractor`.

## 0.3.0 — Itens e inventário · 2026-10-28

### Adicionado
- Catálogo de itens (`src/items/catalog.ts`): relíquias (Sino de exorcismo, Relicário de prata, Boneca de porcelana, Espelho velado) e saque (castiçal, relógio, taça, vaso, caixa de joias, quadro, gramofone), com tamanho, valor, fragilidade e massa.
- Itens físicos no mapa (`src/items/Items.tsx`), sorteados a cada partida: meta + 1 relíquias e o resto saque. Relíquias brilham de leve.
- Inventário de 3 espaços para itens pequenos (`1`–`3`) e um item nas mãos (`src/items/itemStore.ts`); `Q` larga apoiando no chão.
- Item nas mãos desenhado na frente da câmera (`src/items/HeldItem.tsx`). Médio: 8% mais lento. Grande: 25% mais lento, não corre e não abre portas.
- Dano por impacto (acima de 3 m/s, multiplicado pela fragilidade) e barulho ao bater; abaixo de 10% do valor o item quebra.
- Morrer derruba tudo o que carrega no local da morte.
- HUD do inventário: espaços, mãos, valor carregado e relíquias.
- Dica da mira indica quando a ação está bloqueada (ex.: "mãos ocupadas"); comando de teste `aim()`.

## 0.2.0 — Portas e lanterna · 2026-10-28

### Adicionado
- Portas físicas com dobradiça (`src/world/Doors.tsx`), todas no tamanho padrão 1,0 × 2,2 m com textura própria de 4 almofadas e batente de madeira cobrindo as emendas: fechadas ficam trancadas; `E` abre devagar para longe do jogador, `Shift+E` abre/fecha com força; abertas podem ser empurradas com o corpo. Fechar rápido conta como batida.
- Mira de interação com dica (`src/player/Interaction.tsx` + `src/game/systems/interactables.ts`), pronta para os itens da 0.3.0.
- Barramento de ruído (`src/game/systems/noise.ts`): portas fazem barulho baixo, alto ou de batida.
- 1ª porta inicia o timer das entidades: fase `exploring` e, depois de 20 s, `hunted` (contagem no HUD).
- Lanterna forte de mão (`F`, `src/player/Flashlight.tsx`), ligada desde o início, com sombras de paredes, móveis e portas.
- Grupos de colisão (`src/game/physics.ts`): portas ignoram as paredes para girar rente a elas.
- Para desenvolver: `CLAUDE.md` com as convenções, `.claude/launch.json`, `.gitattributes` (quebras de linha LF) e comandos de teste em `window.__relicario` (só em dev).

### Alterado
- Neblina passou para a tecla `N` (`F` agora é a lanterna).
- Vãos de porta da planta viram portas padrão (`DOOR_WIDTH` / `DOOR_HEIGHT` em `buildLevel.ts`), centralizadas no vão; a parede fecha o resto.
- README com os controles do jogo.

## 0.1.0 — Player · 2026-10-28

### Adicionado
- `src/player/Player.tsx`: investigador em primeira pessoa (pointer lock) com cápsula cinemática e o controlador de personagem do Rapier: desliza nas paredes, sobe degraus de até 30 cm e gruda no chão.
- Andar (`WASD`), correr (`Shift`) e agachar segurando `C`. Agachado, a cápsula tem 0,65 m e passa por baixo das mesas; só levanta se houver espaço acima.
- Vida e estamina (`src/player/playerStore.ts`); todos os números em `src/player/config.ts`.
- Balanço de câmera ao andar, correr e agachar.
- HUD: vidas, barras de vida e estamina, mira, aviso "clique para jogar" e tela de fim de jogo.
- 3 vidas por nível: morrer custa uma e renasce no carro; o local da morte fica guardado para A COISA (0.10.0) e aparece nos marcadores (`G`). Sem vidas, fim de jogo; `Enter` recomeça.
- `F1` alterna entre o investigador e a câmera de editor; `K` dá 25 de dano para testar.

### Alterado
- Física com passo variável (um passo por frame), para a câmera não tremer em telas de 120/144 Hz.
- ROADMAP: 0.10.0 agora descreve A COISA, o espírito pacífico que foge com a cabeça do investigador.

## 0.0.1 — Novo conceito · 2026-10-28

### Alterado
- Projeto renomeado para **Relicário**: investigador paranormal que coleta relíquias para o **C.R.O.S** (Centro de Recuperação de Objetos Sobrenaturais) e pode roubar objetos para vender.
- Caminhão → **carro** (início e saída). Itens obrigatórios fixos → meta `relicQuota` de relíquias; pontos de item aceitam `relic` / `loot`.
- Novo tipo `ItemSize` (`small` / `medium` / `large`) para o inventário de 3 espaços da 0.3.0.
- Entidades novas nos dados e marcadores: **Guardiã**, **Sombra** e **Possessor**.
- Removidas as vidas compartilhadas do estado (a regra de morte será redefinida na 0.10.0).
- Manifesto de sons agora é genérico e vazio; o teste de som do painel só aparece quando houver sons.
- README e ROADMAP reescritos para o novo conceito.

### Removido
- Sons em `public/audio/robe`, que não eram próprios.


## 0.0.0 — Base do projeto · 2026-10-28

### Adicionado
- Projeto Vite + React 18 + TypeScript + React Three Fiber, Rapier, Zustand e postprocessing.
- `src/game/data/types.ts`: formato de dados de nível (salas, aberturas, móveis, esconderijos, spawns).
- `src/game/data/levels/mansion-01.ts`: Mansão nível 1 (caminhão, salão, corredores, banheiro, pátio, 2 bibliotecas, leitura, extração roxa e corredor dos fundos).
- `src/world/buildLevel.ts`: transforma a planta 2D em paredes com vãos de porta, vergas, pisos e tetos.
- Colisores fixos de mapa e móveis (prontos para o player da 0.1.0).
- Texturas procedurais retrô (xadrez, madeira, papel de parede, tijolo, azulejo, grama, carpete, metal, livros).
- Luz por zona com lâmpadas que piscam, luar no pátio e prévia do apagão.
- Filtro retrô (baixa resolução, redução de cores, grão e vinheta) e neblina.
- Câmera de editor com visita às salas (V) e marcadores de debug (G).
- Sons da Esposa convertidos para `.ogg` em `public/audio/robe` + manifesto + teste no painel.
