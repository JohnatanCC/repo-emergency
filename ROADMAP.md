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

## ⬜ 0.1.0 — Player
- Controle em primeira pessoa (pointer lock) com corpo físico (Rapier, cápsula cinemática)
- Andar, correr, agachar (altura do colisor muda, passa por baixo de mesas)
- **Vida 100 / Estamina 100**: correr gasta, regenera parado/andando
- Balanço de câmera, passos, HUD mínimo
- Spawn no carro; câmera de editor vira atalho de debug (tecla `F1`)

## ⬜ 0.2.0 — Interação e portas
- Raio de interação (mira no centro da tela) com dica contextual
- Portas com dobradiça (abrir devagar = silêncio, bater = barulho)
- Evento da **1ª porta** → inicia o timer de 20s das entidades

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

## ⬜ 0.5.0 — Ruído, áudio e lanterna
- Barramento de ruído `emitNoise({ pos, radius, type })` (passos, portas, itens caindo)
- Áudio posicional 3D, ambiência, batimento cardíaco por proximidade
- **Lanterna** com bateria; pool de luzes (só as lâmpadas próximas ficam ativas)
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

## ⬜ 0.10.0 — Morte e falha
- 💡 Morrer: você larga tudo o que carrega e acorda no carro com vida máxima menor
- 💡 Segunda morte no mesmo nível: contrato falha, o saque não extraído é perdido

## ⬜ 0.11.0 — Loja do C.R.O.S
- Comprar equipamento entre níveis: lanterna melhor, **mochila +1 espaço**, detector de relíquias, sal (afasta uma entidade por alguns segundos), kit médico…

## ⬜ 0.12.0 — Novos locais assombrados (níveis 2–5)
- Um mapa fixo por nível, cada vez maior e mais escuro
- Metas de relíquias maiores e ajuste de dificuldade

## ⬜ 1.0.0 — Polimento
- Modelos e texturas definitivos, menu, configurações, salvamento, balanceamento
