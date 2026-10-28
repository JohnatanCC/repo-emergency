# Relicário

Jogo de **terror singleplayer** de investigação paranormal.
Projeto pessoal, **sem fins comerciais**, feito por diversão.

Você é um investigador contratado pelo **C.R.O.S** (Centro de Recuperação de Objetos Sobrenaturais) para entrar em locais assombrados e trazer **relíquias**.
Dá para roubar objetos da casa para vender, mas o inventário só tem 3 espaços e o que é grande vai nas mãos.
Tudo vai para o **extrator mágico**, que leva tudo de uma vez quando a meta de relíquias é cumprida. Depois é voltar vivo para o carro.

Versão atual: **0.0.1 — Novo conceito** · próximas etapas em [`ROADMAP.md`](./ROADMAP.md)

## Rodando

```bash
npm install
npm run dev
```

Abre em `http://localhost:5173`.

## Controles (modo editor, até a 0.1.0)

| Tecla | Ação |
|---|---|
| arrastar / scroll / botão direito | girar, zoom, mover câmera |
| `V` | visitar a próxima sala na altura dos olhos |
| `G` | marcadores (spawns, esconderijos, portas) |
| `L` | luz total (para editar) |
| `B` | prévia do apagão pós-extração |
| `R` | filtro retrô |
| `F` | neblina |
| `H` | esconder painel |

## Estrutura

```
src/
  game/
    data/types.ts          formato dos níveis
    data/levels/           um arquivo por nível (mansion-01.ts …)
    stores/gameStore.ts    estado global (fase, debug)
    audio/sounds.ts        manifesto de sons
    systems/               ruído, spawn, extração… (próximas versões)
  world/                   gera e desenha o nível (greybox, luzes, móveis)
  player/                  0.1.0
  items/                   0.3.0 (itens e inventário)
  enemies/                 0.7.0+ (Guardiã, Sombra, Possessor)
  fx/                      pós-processamento retrô
  ui/                      HUD e telas
public/audio/              sons (só próprios ou com licença livre)
```

## Editando o mapa

O mapa usa as mesmas coordenadas da planta 2D (1 unidade = 0.08 m).
Em `mansion-01.ts`:

- **rooms**: retângulos `x, y, w, h`, com tipo de luz (`lit`, `dim`, `dark`, `moon`), piso e parede.
- **openings**: retângulo fino em cima da parede compartilhada (`door` ou `passage`), igual às portas vermelhas do desenho.
- **props / hidingSpots / itemSpawns / enemySpawns**: posições na planta. `itemSpawns` aceitam `relic` e/ou `loot`.
- **relicQuota**: quantas relíquias o extrator precisa para levar tudo.

As paredes, vãos e colisores são gerados automaticamente.

## Créditos de áudio

Nenhum som ainda. Ao adicionar sons de terceiros, liste aqui autor, link e licença.
