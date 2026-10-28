# R.E.P.O: Emergency — Roadmap

Cada versão é uma atualização jogável. A regra: **toda versão roda** (`npm run dev`) e deixa o jogo um passo mais perto do terror completo.
Ao fechar uma versão: mudar `version` no `package.json`, `VERSION_NAME` em `src/game/version.ts` e anotar no `CHANGELOG.md`.

Legenda: ✅ feito · ⬜ a fazer

---

## ✅ 0.0.0 — Base do projeto
- Vite + React + TypeScript + React Three Fiber, Rapier (física), Zustand, pós-processamento
- Estrutura de pastas por sistema (`world/`, `player/`, `enemies/`, `items/`, `fx/`, `ui/`, `game/`)
- Nível definido por dados (`mansion-01.ts`) com salas, portas, móveis, esconderijos, spawns de itens e de monstros
- Gerador de greybox: paredes com vãos de porta, pisos, tetos e colisores automáticos
- Luz por zona (claro → penumbra → escuro) com lâmpadas piscando, pátio com luar
- Prévia do apagão (B)
- Filtro retrô: baixa resolução, redução de cores, grão, vinheta
- Câmera de editor + visita às salas na altura dos olhos (V)
- Sons da Esposa em `public/audio/robe` com manifesto e teste no painel

## ⬜ 0.1.0 — Player
- Controle em primeira pessoa (pointer lock) com corpo físico (Rapier, cápsula cinemática)
- Andar, correr, agachar (altura do colisor muda, passa por baixo de mesas)
- **Vida 100 / Estamina 100**: correr gasta, regenera parado/andando
- Balanço de câmera, passos, HUD mínimo (vida e estamina discretas)
- Spawn no caminhão; câmera de editor vira atalho de debug (tecla `F1`)

## ⬜ 0.2.0 — Interação e portas
- Raio de interação (mira no centro da tela) com dica contextual
- Portas físicas com dobradiça (empurrar, abrir devagar, bater = barulho)
- Evento da **1ª porta** → inicia o timer de 20s dos monstros

## ⬜ 0.3.0 — Itens e carrinho
- "Raio de pegar" estilo R.E.P.O (mola física puxa o objeto para frente da câmera)
- Itens com **valor, fragilidade, massa e tamanho**; dano por impacto reduz o valor
- Carrinho físico empurrável com sensor interno ("cabe no carrinho")
- Sorteio de itens por partida usando os `itemSpawns` do nível
- Itens obrigatórios: **Caixa de música** (toca enquanto segura) e **Taça dourada**

## ⬜ 0.4.0 — Caminhão, extração e fluxo do nível
- Monitor do caminhão: dinheiro coletado + checklist de itens obrigatórios
- Extrator (sala roxa): extrai o carrinho quando os obrigatórios estão dentro
- **Apagão**: luzes apagam, monstros reaparecem no início, volta até o caminhão
- Fases: `truck → exploring → hunted → blackout → results`
- Tela de resultado do nível

## ⬜ 0.5.0 — Ruído e áudio
- Barramento de ruído `emitNoise({ pos, radius, type })` (passos, portas, quebras, caixa de música)
- Áudio posicional 3D, ambiência da mansão, batimento cardíaco por proximidade
- Pool de luzes (só as lâmpadas próximas ficam ativas) e lanterna do jogador

## ⬜ 0.6.0 — Esconderijos
- Agachar debaixo de mesas e cadeiras
- Entrar em armários com visão pela fresta
- Regra: se um monstro **viu você entrar**, o esconderijo fica "marcado"

## ⬜ 0.7.0 — A Esposa (Tier 3)
- Navmesh (recast) gerado a partir do greybox
- Estados: `idle → prowl → targeting → chase (silenciosa) → checkHiding → attack`
- Olhar nos olhos → frenética + grito; tela escurece com a proximidade
- Vasculha esconderijo marcado e puxa o jogador (golpe fatal)
- Sons já mapeados em `src/game/audio/sounds.ts`

## ⬜ 0.8.0 — Patofera (Tier 1)
- Vaga pelo mapa; encostar → agressivo por 10s, **10 de dano/s**
- Não procura em esconderijos

## ⬜ 0.9.0 — Ocopus Ocular (Tier 2)
- Surge no teto; cone de visão puxa o jogador e trava a câmera, **5 de dano/s**
- Ativo por 30s e reaparece em outro ponto do teto
- Forma de escapar (estamina ou arremessar objeto)

## ⬜ 0.10.0 — Morte, cabeça e clones
- 3 vidas compartilhadas por nível; morte → cabeça vira item físico no local
- Renasce no caminhão como clone reserva (glitch de vídeo)
- Extrair a cabeça recupera a vida; acabar as vidas → game over

## ⬜ 0.11.0 — Loja
- Comprar equipamentos entre níveis (lanterna melhor, granada de atordoamento, kit médico, sapatos silenciosos…)

## ⬜ 0.12.0 — Mansão completa (níveis 2–5)
- Um mapa fixo por nível, cada vez maior e mais escuro
- Mais itens obrigatórios e ajuste de dificuldade

## ⬜ 1.0.0 — Polimento
- Modelos e texturas definitivos, menu, configurações, salvamento, balanceamento
