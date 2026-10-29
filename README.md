# Relicário

Jogo de **terror singleplayer** de investigação paranormal.
Projeto pessoal, **sem fins comerciais**, feito por diversão.

Você é um investigador contratado pelo **C.R.O.S** (Centro de Recuperação de Objetos Sobrenaturais) para entrar em locais assombrados e trazer **relíquias**.
Dá para roubar objetos da casa para vender, mas o inventário só tem 3 espaços e o que é grande vai nas mãos.
Tudo vai para o **extrator mágico** (sala roxa): largue os itens lá dentro e, quando a meta de relíquias for cumprida, ele leva tudo de uma vez.
Aí as luzes apagam e é voltar vivo para o carro para receber o pagamento.

Versão atual: **0.12.0 — Novos locais** · próximas etapas em [`ROADMAP.md`](./ROADMAP.md)

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
| `C` ou `Ctrl` (segurar) | agachar (cuidado: `Ctrl+W` fecha a aba do navegador) |
| `E` · `Shift+E` | usar (abrir/fechar porta) · com força |
| `F` | lanterna (gasta bateria; recarrega no carro ou com pilhas) |
| `E` (mirando um armário) · `E` de novo | esconder no armário · sair |
| `E` (mirando um item) | pegar: pequeno vai para o inventário, médio/grande para as mãos |
| `1` `2` `3` · `Q` | escolher espaço do inventário · largar (mãos primeiro) |
| clique esquerdo | usar a ferramenta do espaço escolhido (crucifixo, kit, granada, bastão) |
| `Enter` (pagamento / loja) | ir para a loja · começar o próximo contrato |

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
| `M` | som ligado / mudo |
| `H` | esconder painel |

## Estrutura

```
src/
  game/
    data/types.ts          formato dos níveis
    data/levels/           um arquivo por nível (mansion-01.ts … deep-manor-05.ts) + plan.ts
    stores/gameStore.ts    estado global (fase, debug)
    audio/sounds.ts        manifesto de sons
    systems/               ruído, spawn, extração… (próximas versões)
  world/                   gera e desenha o nível (greybox, luzes, móveis)
  player/                  0.1.0
  items/                   catálogo, itens físicos, inventário e mãos
  enemies/                 entidades + grade de navegação + andar comum (Guardiã, Sombra, Possessor, A COISA)
  fx/                      pós-processamento retrô
  ui/                      HUD e telas
public/audio/              sons (só próprios ou com licença livre)
```

## Locais assombrados

Um por contrato, em ordem (o último se repete): Mansão (1), Orfanato Santa Luzia (2), Hospital de Isolamento (3),
Igreja e Cemitério (4), Mansão Profunda (5). Cada um em `src/game/data/levels/`.

## Editando o mapa

O mapa usa as mesmas coordenadas da planta 2D (1 unidade = 0.08 m).
Nos níveis novos, `room()` e `link()` (`src/game/data/levels/plan.ts`) ajudam: `link('D3', salaA, salaB)` põe a porta no
meio da parede que as duas salas dividem e dá erro se elas não encostarem.
Em cada arquivo de nível:

- **rooms**: retângulos `x, y, w, h`, com tipo de luz (`lit`, `dim`, `dark`, `moon`), piso e parede.
- **openings**: retângulo fino em cima da parede compartilhada (`door` ou `passage`), igual às portas vermelhas do desenho.
  Toda `door` vira uma porta padrão de 1,0 × 2,2 m centralizada no retângulo (`DOOR_WIDTH` / `DOOR_HEIGHT` em `buildLevel.ts`); `passage` usa o vão inteiro.
- **props / hidingSpots / itemSpawns / enemySpawns**: posições na planta. `itemSpawns` aceitam `relic` e/ou `loot`.
- **ambient** (opcional, por sala): sons de ambiente que saem dela: `clock` (relógio), `drip` (goteira), `crickets` (grilos).
- **relicQuota**: quantas relíquias o extrator precisa para levar tudo.

As paredes, vãos e colisores são gerados automaticamente.

## Créditos de áudio

Todos os sons são gerados por código (`src/game/audio/synth.ts`). Ao trocar algum por arquivo de terceiros
(`SOUND_FILES` em `src/game/audio/sounds.ts`), liste aqui autor, link e licença.
