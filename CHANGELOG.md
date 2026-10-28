# Changelog

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
