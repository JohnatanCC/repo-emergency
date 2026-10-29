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

## ✅ 0.3.0 — Itens e inventário
- Catálogo (`src/items/catalog.ts`): 4 relíquias e 7 tipos de saque, com **categoria**, **tamanho**, **valor**, **fragilidade** e massa
- **Inventário de 3 espaços** só para itens pequenos (`1`–`3` escolhem, `Q` larga); com o inventário cheio, o pequeno vai para as mãos
- Itens **médios e grandes vão nas mãos**, um por vez, desenhados na frente da câmera:
  - médio: uma mão (esquerda), 8% mais lento, ainda abre portas
  - grande: duas mãos, 25% mais lento, não corre e não abre portas
- `Q` apoia o item no chão sem estragar; impactos acima de 3 m/s tiram valor (× fragilidade) e fazem barulho; abaixo de 10% do valor, quebra
- Sorteio por partida usando os `itemSpawns`: meta + 1 relíquias, o resto vira saque; recomeçar sorteia de novo
- Relíquias brilham de leve (roxo) para dar para achar no escuro
- Morrer: tudo o que carrega cai no local da morte
- HUD: espaços, item nas mãos, valor carregado e número de relíquias

## ✅ 0.4.0 — Carro, extrator e fluxo do nível
- **Painel do carro** (tela verde retrô): meta, relíquias e saque já no extrator, saldo; depois "extração ok"
- **Extrator mágico** (sala roxa): itens largados dentro ficam depositados; com relíquias **inteiras** suficientes
  para a `relicQuota`, ele carrega por 5 s (luz pulsando, aviso no HUD) e leva **todos** os itens de uma vez, com um clarão.
  Tirar uma relíquia durante a carga cancela
- **Apagão** após a extração: luzes apagam (só carro e extrator acesos), aviso "volte ao carro"
- Fases: `car → exploring → hunted → blackout → results`
- Tela de resultado: pagamento do C.R.O.S (relíquias) + venda do saque, saldo acumulado; `Enter` = próximo contrato
  (itens sorteados de novo, portas fechadas, vidas cheias)
- 💡 A definir: itens trazidos ao carro sem passar pelo extrator também valem? Entidades reaparecem no apagão (0.7.0+)

## ✅ 0.5.0 — Ruído e áudio
- **Todos os sons gerados por código** (`src/game/audio/synth.ts`), sem arquivos; qualquer um pode ser trocado por
  arquivo próprio ou de licença livre em `SOUND_FILES` (`sounds.ts`)
- Áudio posicional 3D (HRTF) com o ouvinte na câmera; `M` deixa mudo
- **Passos** com som do piso (metal, madeira, xadrez, azulejo, grama, carpete) e ruído: agachado 1,5 m, andando 6 m,
  correndo 12 m, × piso (carpete abafa, metal espalha)
- Portas rangem / batem, itens fazem barulho ao bater (taça e porcelana estilhaçam), lanterna dá clique, pegar item farfalha
- Extrator: zumbido, tom subindo durante a carga, sopro com estrondo na extração
- Ambiência da casa por fase (mais grave e alta no apagão), rangidos distantes aleatórios
- **Dentro × fora**: vento forte no pátio e no carro, abafado dentro da casa; trovões distantes (abafados dentro)
- Sons por sala nos dados (`ambient` em `mansion-01.ts`): relógio de pêndulo no Salão, goteira no Banheiro, grilos no Pátio
- **Portas viram física livre**: abrem ao encostar (investigador, itens e, depois, entidades); `E` continua abrindo/fechando
- Iluminação mais escura (lâmpadas mais fracas) com luz de fundo que evita o preto total (`LIGHTING` em `src/game/config.ts`)
- Agachar também com `Ctrl` (`Ctrl+W` ainda fecha a aba: o navegador não deixa bloquear fora da tela cheia)
- Batimento cardíaco pelo nível de perigo (`src/game/systems/danger.ts`, as entidades vão alimentar); por enquanto a fase dá a tensão
- Debug: anéis de ruído no chão (`G`) com o raio de alcance de cada barulho
- 💡 Bateria da lanterna passou para a 0.8.0 (Sombra); pool de luzes fica para quando o mapa crescer (0.12.0)

## ✅ 0.6.0 — Esconderijos
- **Embaixo da mesa**: agachado dentro da área da mesa = escondido (não dá para levantar ali)
- **Atrás da cadeira**: o assento (0,42 m) é baixo demais para caber embaixo; agachado colado nela = esconderijo **parcial**
- **Armário**: `E` entra (rangido + barulho de 3 m); a visão vira a fresta entre as portas, dá para virar só um pouco,
  a lanterna apaga sozinha e não se mexe; `E` sai pela frente e a lanterna volta. Item grande nas mãos não entra
- Cada esconderijo tem uma **cobertura** (armário 1, mesa 0,85, cadeira 0,5) para as entidades usarem
- Regra pronta: `onHide` avisa quando o jogador se esconde; se uma entidade estava olhando, ela chama `mark` e o
  esconderijo fica **marcado** (as entidades da 0.7.0+ é que vão marcar)
- HUD: "escondido · …" (vermelho se marcado); debug `G`: anel verde livre, branco ocupado, vermelho marcado

## 💡 Entidades
Cada uma conversa com uma mecânica do jogo, para que fugir de cada uma seja diferente.

### ✅ 0.7.0 — A Guardiã
- A antiga dona da casa: figura alta de vestido escuro, braços pálidos, cabeça caída; olhos acendem na perseguição
- Aparece na fase `hunted` (pontos `start`); no apagão reaparece perto da entrada (pontos `blackout`) já indo até o jogador
- **Grade de navegação** própria (`src/enemies/nav.ts`, A* + suavização), gerada da planta; sem biblioteca externa
- Corpo cinemático com controlador de personagem: **empurra portas e itens**; se travar, destrava em etapas: joga a porta
  próxima para longe (rangido alto), dá um passo de lado e, por fim, desiste do destino
- Estados: `patrol → idle`, `investigate → search`, `chase`, `checkHiding`, `recover`
- **Ouve** os barulhos (ruído das 0.2–0.5) e vai até eles; ignora os que ela mesma causa
- **Vê** num cone de 110°: alcance pela luz da sala (15/10/6 m), 22 m com a lanterna ligada, × 0,6 agachado;
  embaixo da mesa só de muito perto; no armário não vê. Paredes, móveis e portas bloqueiam
- **Sabe de onde saiu cada relíquia**: ao pegar uma, ela vai até a origem e depois segue o rastro até você
- **Mais rápida a cada relíquia** carregada (+0,35 m/s)
- **Esconderijo marcado**: se te viu entrar, vai direto nele e puxa para fora (armário) e ataca
- Ataque: 40 de dano; depois recua um pouco (chance de fugir)
- Sons próprios gerados: passos arrastados, sussurro que a acompanha, grito ao te ver, golpe
- Batimento cardíaco pela distância e pelo estado dela
- Debug (`G`): estado em cima dela e caminho em vermelho; `window.__relicario.guardia` (estado, visão, caminho)

### ✅ 0.8.0 — A Sombra e a bateria
- **Território**: só as salas escuras (grade de navegação filtrada); **no apagão, a casa inteira** menos carro e extrator
- **Só se move fora do feixe da lanterna** (cone + alcance + linha de visão). Iluminada, congela e treme; a bateria gasta **4×**
- Jogador no território: vai direto nele (4,2 m/s). Numa sala clara perto: **espera na beira da escuridão**. Longe ou escondido: vaga
- **Encostar** (ela em você ou você nela): 60 de dano; depois ela se desfaz e reaparece longe
- Silhueta preta que não reflete luz, olhos pálidos que acendem no feixe; respiração chiada só quando se move
- **Bateria da lanterna**: ~4 min de luz, recarrega no carro; fraca (< 25%) enfraquece e pisca; zerada, apaga. Barra no HUD
- **Pilhas**: 2 por partida em pontos de saque; `E` recarrega 50% na hora, sem ocupar o inventário
- Movimento e destravamento das entidades num módulo comum (`src/enemies/walker.ts`); batimento usa o maior perigo entre elas

### ✅ 0.9.0 — O Possessor
- Mora em **um objeto de saque** sorteado por partida; o objeto parece normal (não tem ponto de nascimento)
- Carregando: **murmúrio** a cada 7 s (o primeiro aos 4 s) que faz barulho de 9 m (atrai a Guardiã) e a vida cai 1,2/s,
  sem matar sozinho (para em 15)
- **Pistas** depois do primeiro murmúrio: o nome tremula no inventário e o objeto treme nas mãos
- **Largar** o objeto (`Q` ou ao morrer) liberta a figura: translúcida, flutua, persegue por 15 s pela casa toda a 2,6 m/s
  (andando você se afasta devagar; correndo, foge); contato tira 25 e ela para 1 s; no armário não alcança.
  Depois **volta para o mesmo objeto**
- **Extrair** o objeto com o Possessor dentro: **multa de $300** no pagamento (linha na tela de resultado).
  Se ele estiver solto na hora da extração, o objeto vai "vazio", sem multa. **Roubar tem risco**

## ✅ 0.10.0 — Morte e A COISA
- Morrer custa **uma vida**, o que carregava cai no local e o investigador renasce no carro
- No lugar da morte surge **A COISA**: espírito negro e curvado (não reflete luz) segurando a **cabeça** do investigador
  - **Pacífica**: ronda perto de onde surgiu; a menos de 7 m **foge** para o ponto mais longe de você que alcança
  - **Corre mais quando você corre**: 3,4 m/s (você andando a 3 não alcança) e 4,8 m/s (você correndo a 5,5 alcança,
    gastando estamina); encurralar ajuda. Não entra no carro nem no extrator
  - Alcançada, **solta a cabeça** e se desfaz; a cabeça é item **médio, nas mãos**
  - Entrar no **carro** com a cabeça (ou largá-la lá dentro) **devolve uma vida**
  - Uma COISA por morte; continua no apagão; contrato novo ou recomeço limpa as que sobraram
- A cabeça não vale dinheiro e o extrator a ignora; as entidades tratam quem a carrega como sempre

## ✅ 0.11.0 — Loja do C.R.O.S
- Entre contratos: pagamento → **loja** (`Enter`) → próximo contrato (`Enter`). Compra com clique ou `1`–`6`
- **Crucifixo** ($400): criatura na mira (até 4 m) fica presa e atordoada por 20 s
- **Kit médico** pequeno/médio/grande ($100/$180/$300): cura 25/50/100 (com a vida cheia não gasta)
- **Granada de luz** ($350): arremessada; o clarão atordoa **todas** as criaturas a até 6 m por 12 s (o estrondo faz barulho)
- **Bastão** ($250): golpe (até 2,2 m) que empurra a criatura e atordoa por 1,5 s; não gasta
- Ferramentas aparecem **no chão do carro** e ocupam **espaço do inventário** (escolha: ferramenta × saque);
  clique esquerdo usa a do espaço escolhido. Com você ou no carro no fim do contrato, voltam ao estoque; largadas na casa se perdem
- Valem para todas as criaturas: Guardiã, Sombra, a figura do Possessor e A COISA (presa, dá para alcançar)
- 💡 Ideias para depois: mochila +1 espaço, lanterna melhor, detector de relíquias

## ✅ 0.12.0 — Novos locais assombrados (níveis 2–5)
- **2 · Orfanato Santa Luzia**: refeitório, dois dormitórios escuros entre corredores, capela, sala da diretora — meta 3, timer 18 s
- **3 · Hospital de Isolamento**: recepção e um corredor longo e escuro com enfermarias e centro cirúrgico — meta 3, timer 16 s
- **4 · Igreja e Cemitério**: adro e cemitério ao ar livre, nave, sacristia, capela lateral, cripta — meta 4, timer 15 s
- **5 · Mansão Profunda**: galerias norte e sul, biblioteca, jantar, quarto, escritório, cozinha, adega, estufa, capela — meta 5, timer 12 s
- Cada contrato cumprido avança um local (o último se repete); a loja mostra o próximo; fim de jogo recomeça no mesmo
- `link()` em `src/game/data/levels/plan.ts`: porta no meio da parede comum entre salas vizinhas (erro se não forem vizinhas)
- Todos os mapas validados pela grade de navegação (carro → todas as salas, itens, criaturas e armários)

## ⬜ 1.0.0 — Polimento
- Modelos e texturas definitivos, menu, configurações, salvamento, balanceamento
