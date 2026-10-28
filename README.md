# Relicário

Jogo de **terror singleplayer** de investigação paranormal.
Projeto pessoal, **sem fins comerciais**, feito por diversão.

Você é um investigador contratado pelo **C.R.O.S** (Centro de Recuperação de Objetos Sobrenaturais) para entrar em locais assombrados e trazer **relíquias**.
Dá para roubar objetos da casa para vender, mas o inventário só tem 3 espaços e o que é grande vai nas mãos.
Tudo vai para o **extrator mágico** (sala roxa): largue os itens lá dentro e, quando a meta de relíquias for cumprida, ele leva tudo de uma vez.
Aí as luzes apagam e é voltar vivo para o carro para receber o pagamento.

Versão atual: **0.4.0 — Extrator e contrato** · próximas etapas em [`ROADMAP.md`](./ROADMAP.md)

## Rodando

```bash
npm install
npm run dev
```

Abre em `http://localhost:5173`.

## Controles

Clique na tela para travar o mouse (`Esc` solta).

| Tecla | Ação |
|---|---|
| `W` `A` `S` `D` · mouse | andar · olhar |
| `Shift` | correr |
| `C` (segurar) | agachar |
| `E` · `Shift+E` | usar (abrir/fechar porta) · com força |
| `F` | lanterna |
| `E` (mirando um item) | pegar: pequeno vai para o inventário, médio/grande para as mãos |
| `1` `2` `3` · `Q` | escolher espaço do inventário · largar (mãos primeiro) |

### Debug

| Tecla | Ação |
|---|---|
| `F1` | alterna investigador / câmera de editor (arrastar, scroll, botão direito) |
| `V` | (editor) visitar a próxima sala na altura dos olhos |
| `G` | marcadores (spawns, esconderijos, portas, mortes) |
| `L` | luz total |
| `B` | prévia do apagão pós-extração |
| `R` | filtro retrô |
| `N` | neblina |
| `K` | tomar 25 de dano |
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
  items/                   catálogo, itens físicos, inventário e mãos
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
  Toda `door` vira uma porta padrão de 1,0 × 2,2 m centralizada no retângulo (`DOOR_WIDTH` / `DOOR_HEIGHT` em `buildLevel.ts`); `passage` usa o vão inteiro.
- **props / hidingSpots / itemSpawns / enemySpawns**: posições na planta. `itemSpawns` aceitam `relic` e/ou `loot`.
- **relicQuota**: quantas relíquias o extrator precisa para levar tudo.

As paredes, vãos e colisores são gerados automaticamente.

## Créditos de áudio

Nenhum som ainda. Ao adicionar sons de terceiros, liste aqui autor, link e licença.
