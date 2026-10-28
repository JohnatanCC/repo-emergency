# R.E.P.O: Emergency

Reimaginação **singleplayer de terror** inspirada em R.E.P.O.
Projeto pessoal, **sem fins comerciais**, feito por diversão.

Versão atual: **0.0.0 — Base do projeto** · próximas etapas em [`ROADMAP.md`](./ROADMAP.md)

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
    stores/gameStore.ts    estado global (fase, vidas, debug)
    audio/sounds.ts        manifesto de sons
    systems/               ruído, spawn, extração… (próximas versões)
  world/                   gera e desenha o nível (greybox, luzes, móveis)
  player/                  0.1.0
  items/                   0.3.0
  enemies/                 0.7.0+
  fx/                      pós-processamento retrô
  ui/                      HUD e telas
public/audio/robe/         sons da Esposa
```

## Editando o mapa

O mapa usa as mesmas coordenadas da planta 2D (1 unidade = 0.08 m).
Em `mansion-01.ts`:

- **rooms**: retângulos `x, y, w, h`, com tipo de luz (`lit`, `dim`, `dark`, `moon`), piso e parede.
- **openings**: retângulo fino em cima da parede compartilhada (`door` ou `passage`), igual às portas vermelhas do desenho.
- **props / hidingSpots / itemSpawns / enemySpawns**: posições na planta.

As paredes, vãos e colisores são gerados automaticamente.
