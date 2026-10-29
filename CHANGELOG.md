# Changelog

## 0.22.0 — Acabamento · 2026-10-29

### Adicionado
- Textura "afim" do PlayStation nas paredes, pisos e tetos (`src/world/affine.ts`, `RETRO_FX.affine`): a textura é interpolada na tela sem correção de perspectiva e entorta levemente quando a câmera se move. Paredes e pisos são divididos em pedaços de ~1,2 m (`RETRO_FX.affineCell`) para o efeito ficar sutil.
- Guardiã com cabelo de pano (`ClothHair`): duas cortinas caindo por cima do rosto e uma manta nas costas até a cintura, deslizando pelo peito e pelos ombros. Saem as mechas rígidas com mola.
- Possessor com tiras de pano na cintura (`ClothHair` com o material translúcido dele): balançam, atrasam e são jogadas para trás quando ele avança.

### Alterado
- Cabelo fosco (material sem brilho especular) em todas as criaturas com `ClothHair`; aceita um material próprio.

### Corrigido
- Sombra: braços não atravessam mais o chão ao rastejar (quadril mais baixo, balanço do braço e cotovelo ajustados).
- Guardiã: dedos não atravessam mais a saia parada (braços um pouco mais abertos).

### Desempenho
- Nível 5 com as criaturas ativas: ~480 draw calls, ~130 mil triângulos, ~7 ms de render por quadro.

## 0.21.2 — Rosto do Espectro · 2026-10-29

### Alterado
- Espectro em tons de branco e cinza (pele, roupa, tiras, manchas; mãos pálidas com pontas sujas).
- Rosto esculpido na própria cabeça (`src/enemies/models/espectroHead.ts`): esfera densa com órbitas afundadas, arcada, nariz fino, maçãs altas, bochechas fundas e queixo afinado; textura projetada de frente com olheiras, órbitas, escorrido preto, veias e a boca costurada. A cabeça é cortada na linha da boca: a mandíbula é a parte de baixo da mesma cabeça, girando numa dobradiça atrás da boca — a costura se rasga ao meio quando ela abre. Sai o plano de rosto colado na frente.
- Franja presa na testa e mais curta: cobre a testa e parte de um olho, o rosto aparece entre as mechas.

### Adicionado
- Gosma preta em volta do Espectro (`FloatingGoo.tsx`): bolhas brilhantes orbitando em alturas diferentes, deformando como líquido e esticando em pingos; mais rápidas e espalhadas quando ela persegue. Gotas pretas caem do corpo.
- Galeria: `&rosto` para ver o rosto de perto.

## 0.21.1 — Cabelo de pano · 2026-10-29

### Adicionado
- Cabelo com física de tecido (`src/enemies/models/ClothHair.tsx`): cada mecha é uma malha de pontos ligados por molas (Verlet) — verticais seguram o comprimento, horizontais mantêm a mecha unida como pano, diagonais impedem que dobre. Presa no couro cabeludo, cai com a gravidade, atrasa quando a cabeça vira, é jogada para trás quando o corpo dispara, desliza por cima do rosto, do peito e dos ombros e balança numa brisa fraca. Simulada no mundo e desenhada na cena.
- Espectro: cinco mantas de cabelo (franja em diagonal, laterais, costas até os ombros, mecha vermelha) no lugar das placas rígidas.

### Alterado
- Espectro mais parecido com a página do caderno: olheiras fundas em volta das duas órbitas, lábios costurados (os pontos somem quando a mandíbula cai), cinto com fivela, tiras compridas pendendo das mangas e da cintura.

### Corrigido
- Ao clicar em Iniciar investigação, o menu de pausa abria (o jogo começava antes de o mouse travar, e o navegador às vezes recusa a trava). Agora a pausa só vale depois que o mouse travou uma vez; antes disso aparece só "clique para entrar".

## 0.21.0 — O Espectro · 2026-10-29

### Adicionado
- **O Espectro** (`src/enemies/espectro/`, `ESPECTRO` em `config.ts`), na Igreja (4) e na Mansão Profunda (5), TIER 3.
  - Modelo (`EspectroModel.tsx`): jovem pálida e magra, de brilho fraco próprio, flutuando com as pernas pendendo; cabelo emo (franja em diagonal cobrindo metade do rosto, camadas espetadas, uma mecha vermelha); sem olhos — órbitas fundas escorrendo; roupa clara de tiras e fivela, tiras soltas nos punhos, mãos sujas de sangue.
  - A boca: com a aproximação a mandíbula se solta e estica além do humano (os dentes só aparecem abrindo; fechada, os lábios são costurados); da metade em diante o peito se divide ao meio e abre como duas portas, mostrando a garganta com fileiras de dentes nas bordas.
  - Animação: flutua balançando, cabeça inclinada, braços e pernas pendurados com atraso; percebendo, a cabeça endireita de um tranco e treme; perseguindo, deita para a frente com braços, pernas e cabelo para trás, e a imagem pula como fita com defeito.
  - IA: vaga em linha reta pela casa atravessando paredes, portas e móveis (sem grade de navegação; o colisor é só um sensor para as ferramentas). A até 4,5 m do jogador — mesmo atrás de parede — para, vira, abre a boca e grita (1,3 s); depois persegue em linha reta, acelerando de 3,2 a 4,6 m/s. Alcançou: mata (100), puxando de dentro do armário se for preciso. O jogador saindo da casa a faz parar na fachada e encarar por 8 s. Crucifixo e granada a seguram.
  - Sons próprios: cantarolar de canção de ninar desafinada enquanto vaga (posicional — o aviso de que está perto), lamento vocal dissonante com pulso grave enquanto persegue, grito rasgado ao abrir a boca.
  - Jumpscare próprio (`JUMPSCARE.stare`): a câmera chega devagar e ela encara o jogador em silêncio por 5 s, só com o coração acelerando e o chiado subindo; então a boca abre, o peito se rasga e ela avança.
- Bestiário: página do Espectro.
- Galeria: `/?galeria=nome` mostra uma criatura só, de perto; botão de boca/bote.
- Debug: `window.__relicario.espectro` (`state`, `pos`, `tp(x, z)`).

## 0.20.0 — Caderno de campo · 2026-10-29

### Alterado
- **Guardiã** (`GuardiaModel.tsx`): alta e curvada, vestido longo de barra esfarrapada, mangas bufantes, gola de renda; braços com cotovelo passando dos joelhos e dedos de duas falanges que se curvam e têm espasmos; cabeça sempre caída sob uma cortina de mechas de cabelo que balançam atrasadas. Passo arrastado com quadril, saia e cabelo em molas; caçando curva mais e estica os braços.
- **Bote da Guardiã** (`GUARDIA.reach/windup/hitRange`): começa a 1,9 m — ergue os braços com um grito curto, levanta a cabeça (o rosto aparece) e o golpe desce 0,45 s depois; erra se o jogador já saiu de 2,2 m. Durante o bote ela anda devagar.
- **Sombra** (`SombraModel.tsx`): ~2,6 m, cabeça alongada sem rosto com dois pontos de luz, espinhos irregulares nos ombros que se arrepiam, braços enormes com três garras, pernas que afinam em ponta, fumaça preta que fica no ar. Vagando anda ereta com passos longos e espasmos; caçando cai de quatro (os braços viram patas); no feixe congela na pose em que estava; perto de portas se curva.
- **Caça em arrancadas** (`SOMBRA.burst`): a velocidade oscila entre 0,55× e 1,5× — dispara, quase para, dispara.
- **Possessor** (`PossessorModel.tsx`): tronco alongado, 12 tiras esfarrapadas abertas no lugar das pernas ondulando como pano na água, braços longos de três garras que abrem e fecham, grito (a mandíbula desce, a cabeça treme), rastro pálido.
- **Possessão** (`POSSESSOR.possessTime`, `possession()` no playerStore): o toque possui por 3,5 s — o investigador anda a menos da metade, a câmera é puxada e inclina, a lanterna apaga e volta, a tela fica verde e pulsando.
- **A COISA** (`CoisaModel.tsx`): corpo de fumaça curvado sobre pernas longas de joelho para trás, um olho aceso, a cabeça (com o pescoço ensanguentado) apertada contra o peito, rastro de fumaça roxa; parada olha em volta aos trancos, fugindo corre baixa e desajeitada.
- **A COISA chama** (`COISA.callEvery/callNoise`): fugindo, sussurra alto a cada 2,5 s — barulho de 10 m que atrai a Guardiã.
- Jumpscare: a Guardiã aparece no meio do bote, com o rosto à mostra; a Sombra de pé, a câmera olhando para cima.
- Bestiário com as descrições novas.

### Adicionado
- `SmokeTrail` (`src/enemies/models/SmokeTrail.tsx`): rastro de partículas no mundo (fica para trás quando a criatura anda).
- Pose: `attack` (bote) e `nearDoor` (perto de porta).

## 0.19.1 — Trilha do menu · 2026-10-29

### Adicionado
- Música do menu (`menuTheme` em `synth.ts`, `src/ui/MenuMusic.tsx`): loop de 32 s — celesta desafinada em arpejos lentos de lá menor (lá m – fá – ré m – mi), acolchoado grave, fita gasta e chiado de disco velho. Cheia na tela de início e no bestiário, baixinha na pausa, some ao jogar. Gerada com tabela de senos (~0,4 s).
- Sons da interface (`src/ui/uiSound.ts`): tique de máquina de escrever ao mover o cursor, estalo com sino grave ao escolher, dois tiques descendo ao voltar e papel virando no bestiário. A loja também usa o som de escolher.

## 0.19.0 — Caçadores · 2026-10-29

### Adicionado
- Criaturas caçadoras (opções no ponto de nascimento: `damage`, `lockTime`, `chaseMusic`), usadas no Hospital: golpe de 50; ao perder o jogador de vista continuam indo atrás dele por 6 s (sabem onde ele está, a menos que se esconda) e depois voltam a patrulhar; a Sombra continua caçando até a beira do território mais perto.
- Música de perseguição (`chase` em `synth.ts`, `src/game/systems/chase.ts`): loop de 150 bpm em ré menor — bumbo, baixo martelando, tique metálico, acorde rasgado e um sopro subindo. Entra quando uma caçadora te persegue e some devagar quando ninguém mais está atrás de você.
- Bestiário (`src/ui/Bestiary.tsx`, menu de início): caderno de campo com uma página dupla por criatura — o modelo girando à luz de vela, nome em latim, TIER de letalidade (0–4, em caveiras), aparência, comportamento e como evitar. Setas ou A/D viram a página; Esc fecha.
- Porta dupla (`double` e `height` nas aberturas, `FRONT_DOOR`): a porta da frente da casa tem duas folhas, 2 m de largura e 2,7 m de altura.

### Alterado
- HUD (`Hud.tsx`) maior e em números: vida (verde), estamina (amarelo), luz da lanterna (azul) e vidas (corações) no canto superior esquerdo; relíquias no extrator em destaque, dinheiro carregado, saldo e local no canto superior direito; inventário maior; moldura VHS no canto inferior direito.
- Grade de ferro do jardim com colisão, em trechos: o vão da traseira do caminhão ficou livre (antes um trilho da grade atravessava a saída na altura dos olhos).
- O embasamento da fachada é interrompido na porta.

## 0.18.0 — Chegada · 2026-10-29

### Adicionado
- Lado de fora (`src/game/data/levels/exterior.ts`, aplicado a todos os níveis em `levels/index.ts`): o "carro" quadrado virou o baú de um caminhão do C.R.O.S, de ré para um jardim de 24 m na frente da casa, com a traseira aberta. A parede da casa é a fachada; os outros lados do jardim são barreira invisível (`WallType 'none'`) atrás de uma grade de ferro e da névoa.
- O jogo começa dentro do baú, de frente para a casa. A porta da frente (de verdade) leva à entrada.
- Prateleira de aço no baú (`rack`): os equipamentos comprados aparecem nas tábuas, 4 por tábua.
- Jardim morto sorteado (sempre igual por nível), longe do caminho: árvores secas de galhos nus, arbustos secos, anjos de pedra com musgo (alguns sem cabeça), postes de ferro apagados ao longo do caminho, uma fonte seca e duas colunas na varanda (`src/world/OutdoorProps.tsx`).
- `src/world/Exterior.tsx`: estrada com faixa sumindo na névoa, caminho de cascalho, grade de ferro com barras tortas e falhas, fachada com embasamento, cornija, telhado, chaminés, janelas em dois andares (algumas acesas, algumas tapadas com tábuas), varanda; caminhão com cabine, rodas, faróis, lanternas traseiras, portas abertas e o logo do C.R.O.S; névoa rasteira.
- Névoa por lugar (`FOG` em `src/game/config.ts`): densa e azulada do lado de fora e no caminhão, a de sempre dentro da casa; o fundo acompanha.
- `wallSides` nas salas (parede diferente por lado).

### Alterado
- Criaturas não saem da casa: o jardim e o caminhão ficam fora da navegação delas (zona segura).
- O mapa ficou mais largo para o lado do jardim: coordenadas do mundo mudaram em x (z continua igual).
- Renascimento: a câmera gira mais perto, para caber no baú.

## 0.17.0 — Mapa do contrato · 2026-10-29

### Adicionado
- Mapa do contrato (`src/ui/MapPanel.tsx`, `MAP` em `src/ui/config.ts`): segurando Tab, o investigador levanta uma folha com a planta da casa — salas, portas, carro, ponto de extração (quadrado roxo), objetos já vistos (pontos amarelos, maiores para relíquias) e uma seta onde ele está, para onde olha.
- "Visto" (`src/world/MapTracker.tsx`): objeto na frente da câmera, a até 14 m e sem parede no meio (ou pego na mão). O mapa limpa a cada partida.
- Destaque na mira (`src/game/systems/aim.ts`, `HIGHLIGHT` em `catalog.ts`): o objeto que a mira acerta brilha quente, pulsando.
- Menu novo (`src/ui/Menu.tsx`): tela de início com o carro ao fundo (Iniciar investigação, Configurações, Controles, Créditos) e pausa (Continuar, Configurações, Controles, Recomeçar contrato, Voltar ao início). Mouse ou setas/W/S + Enter; Esc volta.
- Poeira do ambiente (`src/world/Dust.tsx`): partículas paradas no mundo, só numa caixa em volta do jogador (repetem no shader, sem custo por partícula). Quase invisíveis no escuro; brilham dentro do facho.

### Alterado
- Sombra só no Hospital (3) e na Mansão Profunda (5); os níveis sem Sombra não montam a grade dela.
- A poeira deixou de seguir a lanterna.

## 0.16.0 — Imersão e desempenho · 2026-10-29

### Desempenho
- Paredes, pisos e tetos (`Level.tsx`): uma textura e um material por tipo, com o UV de cada peça escalado para o tamanho dela; peças do mesmo tipo juntas numa malha. De 100–162 draw calls por nível para 6–13, e cada textura sobe uma vez só para a GPU.
- Móveis (`StaticMerge.tsx`): as peças de todos os móveis viram uma malha por material, na tela e na sombra da lanterna.
- Pool de luzes (`RoomLights.tsx`, `LIGHTING.pool`): toda lâmpada tem a bolinha acesa, mas só as 6 mais perto da câmera são luzes de verdade (antes eram todas). Trocar de lâmpada acende aos poucos.
- Sem recompilar shaders no meio do jogo: lanterna e clarão da granada só mudam a intensidade (antes apareciam e sumiam), e `Prewarm.tsx` compila as criaturas junto com o nível.
- Dev: `window.__relicario.stats()` (draw calls, triângulos, luzes, tempo de um quadro).

### Imersão
- Lanterna (`IMMERSION` em `src/player/config.ts`): balança na mão (mais andando), falha quando uma criatura está perto e mostra poeira flutuando no facho.
- Respiração ofegante (som `breath`): cresce correndo, com a estamina baixa ou com perigo.
- Câmera (`Immersion.tsx`): campo de visão abre um pouco correndo e fecha com a tensão (visão de túnel); inclina de leve ao andar de lado.

## 0.15.0 — Renascer · 2026-10-29

### Adicionado
- Renascimento em cena (`src/world/Revive.tsx`, `REVIVE` em `src/player/config.ts`): depois do jumpscare, o C.R.O.S remonta o investigador no carro, parte por parte (pernas, quadril, tronco, braços, lanterna, pescoço, cabeça), com estalos e brilho roxo, e a câmera gira em volta até entrar nos olhos dele. Imune a dano durante a cena. Modelo do investigador em `src/player/InvestigatorModel.tsx`.
- Sons novos (`synth.ts`): batidas na parede, arrasto, gemido, caixinha de música desafinada, acorde de cordas quando a caçada começa (`stinger`), estalo de montagem e sopro do renascimento. Ambiência da casa refeita (respiração grave, tons batendo, cano vibrando longe).
- Eventos distantes no AudioDirector: de 18 a 40 s, algo bate, arrasta ou geme numa sala a 6–18 m.
- `muffle` no motor de áudio (filtro passa-baixa por som) e `AUDIO_ZONES`.
- `delay` nos pontos de nascimento das criaturas (entrada escalonada).
- Vida volta devagar (2,5/s até 70) depois de 8 s sem dano; 1,5 s de imunidade depois de cada golpe de criatura.

### Alterado
- Balanceamento: Mansão e Orfanato voltam a uma Sombra, que só entra 60 s / 40 s depois do começo da caçada. Guardiã: dano 40 → 30, perseguição 3,3 → 3 m/s, +0,2 m/s por relíquia (era 0,35), vê a lanterna a 16 m (era 22), recupera 3 s após golpe. Sombra: dano 60 → 35, caça a 3,4 m/s (era 4,2). Possessor: dano 25 → 15, 2,3 m/s.
- Áudio: sons de fora (grilos, vento, trovão) chegam baixos e abafados dentro de casa, e os de dentro abafados lá fora. Ambiência, vento, grilos, goteira, relógio, trovão e batimento mais baixos.
- Na última vida o jumpscare aparece, mas não há renascimento.

## 0.14.0 — Casa viva · 2026-10-29

### Adicionado
- Decoração gerada a partir da planta (`src/world/Decor.tsx`, números em `DECOR`): quadros (retrato, paisagem, natureza-morta), arandelas, rodapés, meia-cana no papel de parede, manchas de umidade, teias nos cantos, tapetes, papéis no chão, velas nas salas escuras, vigas nos corredores, lustres nas salas grandes e mato seco lá fora. Sem colisor, longe das portas e dos móveis altos; uma malha por material.
- Modelos próprios para todos os objetos (`src/items/models.tsx`): sino, relicário, boneca, espelho velado, castiçal, relógio, taça, vaso, caixa de joias, quadro, gramofone, pilhas, cabeça e ferramentas. A física não muda (mesmo colisor).
- Jumpscare (`src/ui/Jumpscare.tsx`, `JUMPSCARE` em `src/ui/config.ts`): morrer para a Guardiã, a Sombra ou o Possessor mostra o rosto dela avançando contra a tela, com um estouro de som (`scare`), e o sinal da fita cai.
- Molas nas animações das criaturas (`src/enemies/models/spring.ts`, `ANIM`): cabeça, braços, inclinação e saia seguem o alvo com inércia; o corpo atrasa e passa um pouco ao virar.
- `damage(valor, criatura)` guarda quem bateu por último (`lastHit`).

### Alterado
- Balanceamento: Mansão e Orfanato têm uma segunda Sombra (biblioteca B / dormitório B).
- A Sombra aceita várias ao mesmo tempo (perigo e feixe por criatura, `setShadowLit`); `window.__relicario.sombra` é a primeira.
- Móveis redesenhados: mesa com saia, toalha e castiçal; cadeira de ripas; armário com cornija e almofadas; estante com livros soltos; banheira de pés. Colisores agora são caixas fixas por tipo.
- Dev: o canvas guarda o último quadro (`preserveDrawingBuffer`), para copiar a imagem nos testes.

## 0.13.0 — Terror retrô · 2026-10-29

### Adicionado
- Modelos novos das quatro criaturas (`src/enemies/models/`), no estilo PS1: vértices presos a uma grade de tela (`psx.ts`), sombreamento facetado e texturas 16×20 pintadas por código (`textures.ts`). Cada criatura passa uma `pose` (andando, alerta, caçando, na luz, atordoada, sumindo) que o modelo anima.
- Tela de título e menu de pausa com volume e sensibilidade do mouse, salvos no navegador (`src/game/stores/settingsStore.ts`, `src/ui/Screens.tsx`).
- Moldura de câmera VHS: REC piscando, contador da fita (só anda com o jogo rodando) e a data do contrato.
- Retorno de dano: clarão vermelho e borda pulsando abaixo de 30% de vida.
- Pós-processamento: linhas de varredura e deslocamento de cor de fita (`RETRO_FX` em `src/game/config.ts`).
- Dev: `?galeria` mostra os quatro modelos lado a lado, com botões de pose.

### Alterado
- Soltar o mouse pausa o jogo de verdade (física parada; o cronômetro das entidades desconta a pausa).
- HUD do canto mostra só o local e o objetivo; versão, fase e cronômetro ficam no painel de teste (`H`, desligado por padrão).
- Marcadores de debug (`G`) começam desligados.

## 0.12.0 — Novos locais assombrados · 2026-10-29

### Adicionado
- Quatro locais novos: Orfanato Santa Luzia (meta 3), Hospital de Isolamento (meta 3), Igreja e Cemitério (meta 4) e Mansão Profunda (meta 5), cada um maior e mais escuro.
- Progressão: cada contrato cumprido leva ao próximo local (o último se repete); a loja mostra o próximo contrato.
- `room()` / `link()` (`src/game/data/levels/plan.ts`) para desenhar níveis sem errar a posição das portas.

## 0.11.0 — Loja do C.R.O.S · 2026-10-29

### Adicionado
- Loja entre contratos (`src/game/shop.ts`, tela no HUD): crucifixo, kits médicos pequeno/médio/grande, granada de luz e bastão.
- Ferramentas compradas aparecem no chão do carro e ocupam espaço no inventário; clique esquerdo usa (`src/player/Tools.tsx`). As que voltam com o jogador ou ficam no carro retornam ao estoque.
- Registro de criaturas e atordoamento comum (`src/game/systems/creatures.ts`, `src/enemies/stun.ts`): presas não andam, não atacam; o bastão também empurra.
- Aviso rápido na tela para ações sem efeito ("nenhuma criatura na mira", "vida cheia").
- Debug: `window.__relicario.useTool()`.

### Alterado
- Fluxo: pagamento → loja → contrato (o pagamento entra no saldo ao abrir a loja).
- O HUD fica acima dos rótulos de debug do mapa; o painel de debug some nas telas de pagamento e loja.
- Posição das entidades no debug é atualizada todo passo (inclusive atordoadas).

## 0.10.0 — A COISA · 2026-10-29

### Adicionado
- A COISA (`src/enemies/coisa/`): surge onde o investigador morreu, segurando a cabeça dele. Pacífica: ronda o lugar e foge quando o jogador chega a 7 m (3,4 m/s; 4,8 m/s se ele corre). Alcançada, solta a cabeça e se desfaz.
- A cabeça do investigador (item médio, nas mãos): entrar no carro com ela, ou largá-la lá dentro, devolve uma vida.
- `spawnItem` e `discard` no store de itens; `regainLife` no gameStore.
- Debug: `window.__relicario.coisa` (lista com estado e posição).

### Alterado
- O marcador de debug no local da morte agora diz "morte" (A COISA de verdade anda pelo mapa).

## 0.9.0 — O Possessor · 2026-10-29

### Adicionado
- O Possessor (`src/enemies/possessor/`): mora num saque sorteado por partida. Carregando: murmúrios que fazem barulho e drenam vida (sem matar sozinho). Depois do primeiro murmúrio o item tremula no inventário e treme nas mãos. Largado: a figura translúcida sai, persegue por 15 s (2,6 m/s, 25 de dano com pausa de 1 s) e volta para o objeto.
- Multa de $300 do C.R.O.S por objeto possuído extraído com o Possessor dentro; linha na tela de resultado.
- Som novo: murmúrio curto (variações do sussurro).
- Debug: `window.__relicario.possessor` (carregando?, figuras soltas, estado, posição).

### Alterado
- Os pontos de nascimento do Possessor saíram dos dados do mapa (ele nasce do objeto).

### Corrigido
- A vida não passa mais do máximo.

## 0.8.0 — A Sombra · 2026-10-29

### Adicionado
- A Sombra (`src/enemies/sombra/`): vive nas salas escuras (no apagão, na casa inteira menos carro e extrator), só se move fora do feixe da lanterna, vai direto no jogador dentro do território, espera na beira da escuridão quando ele está numa sala clara e, ao encostar, tira 60 e reaparece longe. Silhueta preta com olhos que acendem no feixe; respiração chiada ao se mover.
- Bateria da lanterna: ~4 min de luz, 4× mais rápido com o feixe na Sombra, recarga no carro, luz fraca e piscando abaixo de 25%, apaga zerada; barra no HUD.
- Pilhas (suprimento): 2 por partida em pontos de saque; pegar recarrega 50% sem ocupar o inventário.
- Grade de navegação com território (filtro de salas) e `nearestPoint`; `beam` (estado do feixe) e `setDanger` por fonte.
- Debug: `window.__relicario.sombra` (estado, `lit`, `tp`).

### Alterado
- Andar e destravar das entidades extraídos para `src/enemies/walker.ts` (a Guardiã usa o mesmo módulo).
- A Guardiã considera a lanterna acesa de verdade (ligada e com bateria) para te ver de longe.
- Batimento cardíaco usa o maior perigo entre as entidades.

### Corrigido
- Itens que caem para fora do mapa voltam para onde nasceram.

## 0.7.0 — A Guardiã · 2026-10-28

### Adicionado
- A Guardiã (`src/enemies/guardia/`): patrulha, ouve barulhos, vê num cone (alcance pela luz, lanterna e postura), persegue, ataca (40) e recua; segue a origem das relíquias pegas e o rastro até o jogador; fica mais rápida a cada relíquia carregada; vai direto em esconderijos marcados e puxa o jogador do armário.
- Grade de navegação gerada da planta com A* (`src/enemies/nav.ts`).
- `Enemies`: entidades aparecem na fase `hunted` e reaparecem no apagão perto da entrada.
- Sons gerados: passos arrastados, sussurro (loop que acompanha), grito, golpe. Loops 3D agora podem se mover (`setPos`).
- Eventos para entidades: `onFirstTaken` (itens) e grupos de colisão `ENEMY` e `SIGHT`.
- Portas: `doorHandles` para entidades abrirem na força quando travam.
- Debug: estado e caminho da Guardiã (`G`) e `window.__relicario.guardia`.

### Corrigido
- Abrir uma porta rápido a partir do fechado não conta mais como batida (só ao fechar).
- Guardiã ficava parada para sempre na patrulha (o destino antigo não era esquecido e ela "já tinha chegado" de novo a cada volta).
- Travamentos em portas abertas atravessadas, quinas de estantes e itens: detecção por progresso (e por "não saiu do lugar", que vale também na perseguição) e destravamento em etapas — joga portas próximas para longe dela em qualquer ângulo, dá um passo de lado, e por fim desiste do destino.
- Caminhos com folga: a grade fica 10 cm mais longe de paredes e móveis (não nos vãos de porta) e a suavização confere três linhas paralelas, sem cortar quinas.
- Paradas mais curtas na patrulha (1–2,5 s).

## 0.6.0 — Esconderijos · 2026-10-28

### Adicionado
- Esconderijos (`src/world/HidingSpots.tsx`): embaixo da mesa (agachado), atrás da cadeira (parcial) e armário.
- Armário: `E` entra e sai; visão pela fresta (`hud-wardrobe`), câmera presa com pouco giro, lanterna apaga ao entrar e volta ao sair, rangido e barulho. Item grande nas mãos impede de entrar.
- `src/player/hidingStore.ts`: esconderijo atual, cobertura por tipo, esconderijos marcados e `onHide` para as entidades.
- HUD "escondido" (vermelho se marcado) e cores dos esconderijos no debug (`G`).

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
