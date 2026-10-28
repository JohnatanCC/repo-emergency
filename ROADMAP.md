# Relicário — Roadmap

Cada versão é uma atualização jogável. A regra: **toda versão roda** (`npm run dev`) e deixa o jogo um passo mais perto do terror completo.
Ao fechar uma versão: mudar `version` no `package.json`, `VERSION_NAME` em `src/game/version.ts` e anotar no `CHANGELOG.md`.

Legenda: ✅ feito · ⬜ a fazer · 💡 sugestão (ainda aberta para mudar)

## A premissa

Você é um **investigador paranormal** contratado pelo **C.R.O.S** (Centro de Recuperação de Objetos Sobrenaturais). Cada nível é um local assombrado:
você chega de **carro**, invade o lugar, encontra as **relíquias** que o C.R.O.S quer e, se quiser arriscar,
**rouba** objetos da casa para vender por fora. Tudo vai para o **extrator mágico**; quando a meta de relíquias
é cumprida, o extrator leva **tudo de uma vez**. Depois é voltar vivo para o carro.

---

## ✅ 0.0.0 — Base do projeto
- Vite + React + TypeScript + React Three Fiber, Rapier (física), Zustand, pós-processamento
- Nível definido por dados (`mansion-01.ts`), gerador de greybox, luz por zona, prévia do apagão, filtro retrô, câmera de editor

## ✅ 0.0.1 — Novo conceito
- Projeto vira **Relicário** (investigação paranormal); dados do nível usam carro, relíquias, saque e as novas entidades

## ✅ 0.1.0 — Player
- Controle em primeira pessoa (pointer lock) com corpo físico (Rapier, cápsula cinemática + controlador de personagem)
- Andar (`WASD`), correr (`Shift`), agachar segurando `C`: a cápsula cai para 0,65 m e passa por baixo das mesas;
  só levanta se houver espaço acima da cabeça
- **Vida 100 / Estamina 100**: correr gasta, regenera depois de 1 s sem correr; zerada, só volta a correr com 30
- Balanço de câmera, HUD mínimo (vidas, vida, estamina, mira)
- Spawn no carro; `F1` alterna para a câmera de editor
- **3 vidas**: morrer custa uma e renasce no carro; o local da morte fica guardado para A COISA (marcador no `G`);
  sem vidas, fim de jogo (`Enter` recomeça). `K` dá 25 de dano para testar
- Números todos em `src/player/config.ts`
- Os passos com som ficam para a 0.5.0 (ainda não há sons)

## ✅ 0.2.0 — Interação, portas e lanterna
- Mira de interação (raio do centro da tela, 2,2 m) com dica contextual; paredes bloqueiam
- Portas com dobradiça (corpo dinâmico + junta de revolução), tamanho padrão 1,0 × 2,2 m:
  - fechada fica trancada; `E` abre devagar para longe do jogador (barulho baixo)
  - `Shift+E` abre/fecha com força (barulho alto); fechar rápido conta como **batida**
  - aberta fica solta e pode ser empurrada com o corpo
- Evento da **1ª porta** → fase `exploring` e timer de 20 s → fase `hunted`
- Barramento de ruído (`src/game/systems/noise.ts`), já usado pelas portas
- **Lanterna** forte de mão (`F`, começa ligada), com sombras e um leve atraso ao virar
- Grupos de colisão (`src/game/physics.ts`); comandos de teste `window.__relicario` em dev

## ⬜ 0.3.0 — Itens e inventário
- Itens com **categoria** (`relic` / `loot`), **tamanho** (`small` / `medium` / `large`), **valor** e **fragilidade**
- **Inventário de 3 espaços** só para itens pequenos (teclas `1`–`3` para escolher, `Q` para largar)
- Itens **médios e grandes vão nas mãos**, um por vez:
  - médio: uma mão, ainda dá para abrir portas
  - 💡 grande: duas mãos, não corre e não abre portas (precisa largar ou empurrar com o corpo)
- Largar/derrubar item quebrável reduz o valor e faz barulho
- Sorteio de itens por partida usando os `itemSpawns` do nível (pontos `relic` podem virar relíquia ou saque)

## ⬜ 0.4.0 — Carro, extrator e fluxo do nível
- **Painel do carro**: meta de relíquias do contrato + valor do saque coletado
- **Extrator mágico** (sala roxa): itens depositados ficam guardados lá; quando o número de relíquias chega a `relicQuota`,
  ele é ativado e leva **todos** os itens depositados ao mesmo tempo
- **Apagão** após a extração: luzes apagam, entidades reaparecem perto da entrada, volta até o carro
- Fases: `car → exploring → hunted → blackout → results`
- Tela de resultado: pagamento do C.R.O.S (relíquias) + venda do saque

## ⬜ 0.5.0 — Ruído e áudio
- Passos e itens caindo também emitem ruído (`emitNoise` já existe desde a 0.2.0)
- Áudio posicional 3D, ambiência, batimento cardíaco por proximidade
- 💡 **Bateria da lanterna** (importante para a Sombra); pool de luzes (só as lâmpadas próximas ficam ativas)
- Sons só próprios ou de licença livre (freesound.org), com créditos no README

## ⬜ 0.6.0 — Esconderijos
- Agachar debaixo de mesas e cadeiras
- Entrar em armários com visão pela fresta
- Regra: se uma entidade **viu você entrar**, o esconderijo fica "marcado"

## 💡 Entidades
Cada uma conversa com uma mecânica do jogo, para que fugir de cada uma seja diferente.

### ⬜ 0.7.0 — A Guardiã
- A antiga dona da casa. **Sabe de onde saiu cada relíquia**: quando você pega uma, ela vai até aquela sala e segue o rastro
- Fica **mais rápida quanto mais relíquias** você carrega (inventário + mãos)
- Navmesh (recast) gerado a partir do greybox; estados `idle → patrol → investigate → chase → checkHiding → attack`
- Vasculha esconderijos marcados

### ⬜ 0.8.0 — A Sombra
- Vive nas salas `dark`. **Só se move quando não está no feixe da lanterna**
- Iluminada, congela, mas a lanterna descarrega mais rápido enquanto você a encara
- Encostar = dano alto; não entra em salas `lit`

### ⬜ 0.9.0 — O Possessor
- Entra em **um objeto de saque** aleatório por partida; o objeto parece normal
- Carregar o objeto possuído: sussurros (fazem ruído) e a vida cai devagar
- Largar o objeto liberta o Possessor, que persegue por um tempo
- Extrair o objeto possuído: o C.R.O.S desconta do pagamento. **Roubar tem risco**

## ⬜ 0.10.0 — Morte e A COISA
- Morrer custa **uma vida** e o investigador renasce no carro (base pronta na 0.1.0)
- No lugar da morte surge **A COISA**: um espírito negro segurando a **cabeça** do investigador
  - Criatura única e **pacífica**: não ataca, só **foge** quando o jogador chega perto (usa a navmesh da 0.7.0)
  - Alcançá-la faz soltar a cabeça; a cabeça é um item que vai **nas mãos** (regras da 0.3.0)
  - Levar a cabeça de volta ao **carro** devolve a vida perdida
  - Uma COISA por morte; várias mortes = várias COISAS espalhadas pelo mapa
- 💡 A definir: A COISA corre mais quando você corre? Some no apagão? Entidades atacam quem está carregando a cabeça?
- 💡 Ao morrer, o que estava no inventário e nas mãos cai no chão no local da morte

## ⬜ 0.11.0 — Loja do C.R.O.S
- Comprar equipamento entre níveis: lanterna melhor, **mochila +1 espaço**, detector de relíquias, sal (afasta uma entidade por alguns segundos), kit médico…

## ⬜ 0.12.0 — Novos locais assombrados (níveis 2–5)
- Um mapa fixo por nível, cada vez maior e mais escuro
- Metas de relíquias maiores e ajuste de dificuldade

## ⬜ 1.0.0 — Polimento
- Modelos e texturas definitivos, menu, configurações, salvamento, balanceamento
