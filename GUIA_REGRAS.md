# Guia de regras (referência de projeto)

Documento de consulta para o aplicativo de **criação de fichas**. Sintetiza o que está espelhado em `Private & Shared/Guia do Jogador`, `Listas` e `Cartas`. Quando houver conflito entre exportações (HTML Notion vs. Markdown vs. CSV), **confirme no texto-fonte da carta ou na página do Guia**.

---

## 1. Fontes de dados no repositório

| Área | Caminho | Uso típico |
|------|---------|------------|
| Regras e listas (export Notion) | `Private & Shared/Guia do Jogador/` | Introdução, Sumário de Conceitos, Raças, Classes, Condições, Itens, árvore de Cartas em HTML |
| Catálogo tabular | `Listas/.../Cartas *.csv` | Importação em massa (campos como Nome, Tipo, Modo de Uso, Origem, Custo, etc.) |
| Cartas em texto simples | `Cartas/*.md` | Uma carta por arquivo; bom para parsing e UI (cabeçalho `# Nome` + propriedades) |

---

## 2. Visão geral do sistema

- RPG com **atributos enxutos** e **grande variedade de habilidades** (cartas) que definem o que o personagem faz no combate e fora dele.
- **Cena**: unidade de narrativa; muda quando situação, contexto ou ambiente relevante muda.
- **Habilidades** são o núcleo da jogabilidade; raça e classe moldam atributos iniciais, vida/energia, **origens** de aprendizado e **baralhos** de habilidades.

---

## 3. Atributos

### 3.1 Os seis atributos (Introdução)

| Atributo | Papel resumido | Efeitos mecânicos explícitos no guia |
|-----------|----------------|--------------------------------------|
| **Corpo** | Físico, força, resistência | Modifica **vida** (valor + treinos) |
| **Mente** | Raciocínio, intelecto, decisão | — |
| **Alma** | Essência, espiritualidade, intuição | Modifica **energia** (valor + treinos) |
| **Destreza** | Precisão, reflexos, técnica física | **Reações** (quantidade) e **Esquiva** |
| **Conhecimento** | Aprendizado acumulado, memória prática | — |
| **Foco** | Concentração, vontade, canalização | — |

**Nota de projeto:** em alguns exemplos antigos aparece “Habilidade” como rótulo; nas regras canônicas da Introdução os atributos são os seis acima. Para fichas, alinhar à **Introdução** e à página da raça/classe.

### 3.2 Escolha do atributo em testes

- Não há vínculo fixo “situação X sempre usa atributo Y”: o jogador **propõe** qual atributo representa o método; o mestre **aceita ou não**.
- Exemplo do guia: intimidação pode ser **Conhecimento** (técnica social), **Corpo** (intimidação física), etc.

### 3.3 Atributo absoluto

- Aparece em conteúdos específicos (ex.: rituais de raça). Trate como **valor “cheio” do atributo** quando uma regra exige ignorar modificadores temporários, salvo texto contrário.

---

## 4. Testes e dificuldade

### 4.1 Resolução base

- Rolagem padrão: **2d6**.
- O jogador pode combinar **duas aplicações** do modificador do atributo escolhido (antes de aceitar o resultado final):
  1. **Relançar dados**: até **N** vezes, onde **N = modificador** (pode relançar o mesmo dado mais de uma vez).
  2. **Somar modificador**: aceitar os 2d6 e **somar o modificador** ao total.
- **As duas opções podem ser usadas no mesmo teste** (relançar até o limite e depois somar, conforme o guia).

### 4.2 Sucesso

- Resultado final **≥ dificuldade** definida pelo mestre.

### 4.3 Vantagem

- **+1d6** além dos 2d6 habituais; esse dado **soma-se** ao resultado.

### 4.4 Testes em conjunto

- Cada personagem rola **1d6** + modificadores; **soma-se** os resultados finais. A dificuldade deve refletir o esforço duplo.

### 4.5 Tabela de dificuldade (referência do guia)

- Níveis **1–2**: sucesso automático; **3** a **12**: chances decrescentes; **13+**: impossível (0% no modelo do guia).
- O guia traz exemplos narrativos por faixa para **cada atributo** (útil para tooltips ou gerador de DC sugerida, sempre como sugestão ao mestre).

### 4.6 Limiar

- Mencionado em regras específicas (ex.: rituais): testes podem ter **vários limiares**; falhas podem somar **dano verdadeiro** igual à **soma dos limiares** quando aplicável.

---

## 5. Hierarquia de tempo (turno / estrutura)

Ordem conceitual (do menor para o maior custo temporal), conforme Sumário:

**Descanso → Ação → Reação → Ação livre**

- O que cabe num tempo menor pode ser feito gastando um tempo maior (ex.: reação como ação).
- **Passivo**: enquanto condições forem cumpridas.
- **Morrendo**: pode ativar efeitos no momento em que a condição é adquirida.

---

## 6. Ações e reações

### 6.1 Ações (turno próprio)

- Número base: **1** (efeitos podem aumentar).
- **Uma ação = um feito** da lista (não exaustiva no guia): **Golpear**, **Mover-se** (até **2× deslocamento**), **Usar habilidade** (tempo ≤ Ação), **Agarrar** (corpo a corpo → condição **Agarrado**), **Realizar um feito** (simples; pode exigir teste), **Utilizar item** (tempo ≤ Ação).
- O turno **termina** após usar as ações.

### 6.2 Reações (qualquer momento na cena)

- Número base: **1**, aumenta com **Destreza** (tabela 0→1 até 5→4; regra de extrapolação: aproximadamente **+1 reação a cada 2 pontos** de Destreza).
- **Uma reação = um feito**: defesa (**Bloqueio** ou **Esquiva**), **Mover-se** (até deslocamento), **Habilidade** (tempo ≤ Reação), **Item**, **Feito simples** (ainda mais restrito que ação).
- **Ordem**: reações ocorrem **depois** do evento que as provoca; defesas **no momento** em que o dano seria aplicado; empate de prioridade → maior **Destreza**, depois **d6**; reações podem ser **invalidadas** e perdidas.

### 6.3 Ação livre

- Não consome ações nem reações; só habilidades com **Modo de Uso: Ação livre** (ou equivalente).

---

## 7. Combate e defesa

### 7.1 Esquiva

- Valor inicial **6** + **modificador de Destreza** + ajustes de itens/habilidades.
- Na **reação de esquiva**, o atacante faz **teste de acerto**; se o resultado **não superar** a Esquiva do alvo, **dano e efeitos são anulados**.
- Ataque em **área**: o defensor precisa **sair da área** com o movimento da reação; se o deslocamento não alcançar, **falha**.
- **Golpe limpo** ignora Esquiva (e Bloqueio). Esquiva pode anular até **dano verdadeiro** (texto do guia).

### 7.2 Bloqueio

- Reduz dano na reação **Bloquear** pelo valor do atributo de Bloqueio (itens/habilidades alteram).
- **Golpe limpo** e **dano verdadeiro** ignoram Bloqueio no cálculo.

### 7.3 Golpe limpo

- Quando o alvo **não tem reações** suficientes para reagir ao ataque, ou quando um efeito diz que o ataque é limpo (**mesmo com reações**, não pode usar contra esse ataque).

### 7.4 Golpe crítico

- Quando o **dano rolado é o máximo** do dado (ex.: 6 em 1d6), ou quando efeito define crítico (nesse caso pode não precisar rolar; dano máximo).
- Efeito adicional depende do **tipo de dano** (ver Sumário **Tipos de Dano**).

### 7.5 Disparo

- Ataques com armas de **fogo** ou **bestas** (conceito de subcategoria de ataque).

### 7.6 Alcances (lista de conceitos)

- **Si mesmo**, **Corpo a corpo**, **Médio**, **Longo**, **Efeito em área**, **Em cena**, **Universal** (e variações citadas nas cartas).

### 7.7 Tipos de dano

- **Corte**, **Perfuração**, **Impacto**, **Queimadura**, **Congelamento**, **Elétrico**, **Verdadeiro** (cada um com regras/efeitos no Sumário e nas cartas).

---

## 8. Vida, energia, descanso

### 8.1 Vida

- **Temporária** (atual) vs **permanente/máxima** (valor absoluto; mudanças raras).
- Dano reduz vida temporária; cura recupera.
- **PC com vida 0**: adquire **Morrendo** (não é morte imediata por si só).
- **Vida inicial (PC)** = **Vida inicial (Raça)** + **Vida inicial (Classe)** + **valor do atributo Corpo** + **bônus de habilidades**.

### 8.2 Morrendo (condição)

- Ao entrar: **marca 1 cicatriz**.
- Cada dano enquanto Morrendo: **anula o dano**, **+1 cicatriz** (em vez de dano).
- Qualquer um pode gastar **Ação** para **abater** instantaneamente o personagem (regra marcada como opcional no guia).
- **Remoção**: terminar o turno com **vida > 0**.

### 8.3 Cicatrizes

- Marcas ao **cair para 0 de vida** em combate/cena (e interações específicas).
- Com **5 cicatrizes**, ao chegar a 0 de vida o personagem **morre** ao entrar em Morrendo (última vez).
- Remoção: habilidades específicas, decisões de mesa, etc.

### 8.4 Energia

- **Atual** vs **total/máxima** (análogo à vida).
- **0 de energia**: em geral **sem penalidade global**; impede usar habilidades/itens que **custem energia**.
- **Energia inicial (PC)** = **Energia inicial (Raça)** + **Energia inicial (Classe)** + **valor do atributo Alma** + **bônus de habilidades/equipamentos**.
- **Recuperação**: principalmente **descanso** (quantidade conforme duração da cena de descanso — detalhar conforme texto das habilidades/mesa).

### 8.5 Mana nas cartas HTML vs. Markdown

- Em exportações Markdown de magias, o custo aparece tipicamente como **“X de energia”** (ex.: `Bola de Fogo`). Em alguns HTML legados pode aparecer **“mana”**; para o app, mapear como **custo de recurso da carta** (na prática do dataset `.md`, energia).

---

## 9. Movimento

- **Deslocamento** padrão inicial: **3 metros** por ação de movimento (ajustes por habilidade/condição).
- Direção livre salvo condições como **Voando** / **Submerso** (movimento vertical, etc.).

---

## 10. Habilidades (cartas) — tipos e metasistema

Resumo dos **tipos** descritos no Sumário de **Habilidades**:

- **Habilidade** (genérico; ativa/passiva).
- **Música**: performance; em geral **só uma música ativa por cena**; manutenção paga **tempo de uso + custo** a cada turno.
- **Magia**: efeitos exóticos; custo em energia conforme impacto; interage com classes como **Mago**, **Enfeitiçado**.
- **Ritual**: como magia, porém com custos/condições mais elaboradas; **Xamã**, **Alquimista**, etc.
- **Língua**: passiva; idioma/cultura.
- **Golpe**: manobras/ataques físicos; **Lutador**, **Gladiador**, etc.
- **Receita**: criação (itens, comida, poções…), muitas vezes em **descanso** com componentes; **Alquimista**, **Aventureiro** (Forjador, Cozinheiro…).
- **Técnica inigualável**: habilidades fortes/únicas (às vezes ligadas a NPC ou lore).
- **Habilidade inata**: ligada à **raça** (pode ter subtipos).
- **Habilidade característica**: **inicial da classe**, sem pré-requisito; define mecânicas centrais e acrescenta **Origens** ao conjunto de opções de aprendizado.
- **Treinamento**: evolução de atributos, vida, energia, etc.

### 10.1 Campos comuns nas cartas (CSV / MD)

- **Nome**, **Tipo**, **Modo de Uso**, **Tempo de Uso**, **Alcance** (pt/br varia: Alcançe/Alcance), **Origem** (para elegibilidade de aprendizado), **Custo** (energia, componentes…), **Condição de aprendizado** (quando existir), texto de efeito.

### 10.2 Magias — níveis de poder (página Magias)

- **Baixíssimo**: manipulação “pura” de conceitos físicos (tempo, espaço, matéria, energia) — linha **Cósmicas**, **Magia do Caos**, etc.
- **Baixo**: transmutações mais puras (ex.: **Cristal**, **Alquimia**).
- **Alto**: combinações (ex.: luz, ar, fogo…).
- **Altíssimo**: conceitos complexos (vida, morte, sangue, misturas multi-conceito).

### 10.3 Cultista — Ligação

- Recurso **0–20** entre cultista e entidade; **0 rompe o pacto**; **20** dispara efeito conforme o pacto. Ajuste por ações/requisitos do pacto.

---

## 11. Criação de ficha (checklist de dados)

A página exportada `Criação de Ficha` está **mínima** (só esqueleto: nome, idade, descrição, raça). Para o app, derive o fluxo do guia:

1. **Dados básicos** (identidade, idade, descrição).
2. **Raça** → atributos iniciais da raça, habilidades inatas, modificações de vida/energia iniciais da raça (quando houver).
3. **Classe** → **Habilidade(s) característica(s)**, **Baralho de Habilidades**, atributos iniciais da classe, **vida/energia iniciais da classe**, **Origens** adicionais.
4. **Distribuição/evolução** de atributos (treinamentos, nível — se a campanha usar progressão documentada nas cartas de treino).
5. **Habilidades escolhidas** respeitando **Origem** e **Condição de aprendizado** das cartas.
6. **Equipamentos** (modificam atributos; podem ter habilidades).
7. **Derivados**: vida/energia totais, reações, esquiva, bloqueio, deslocamento.
8. **Condições ativas** / **cicatrizes** / **ligação** (se aplicável) em runtime, não necessariamente na criação.

**Exemplo de bloco de classe (Mago):** +2 Conhecimento, +1 Alma; **6 vida**, **8 energia**; **Origem: Mago**; baralho **Magia do Aprendizado** (nome no HTML exportado).

---

## 12. Condições

- **Simples**: efeitos genéricos; “remove uma condição” remove uma simples qualquer.
- **Complexas**: efeitos fortes/específicos; remoção segue o texto (muitas vezes com RP ou ação dedicada).
- Metadados: **Nome**, **Texto**, **Acúmulo** (quando empilha).

---

## 13. Itens e equipamentos

- Modificam atributos; podem conceder habilidades passivas/ativas (ver Sumário **Equipamentos**).

---

## 14. Sugestões para o aplicativo de ficha

1. **Modelo de dados** alinhado aos campos do CSV + campos do Markdown (normalizar `Alcançe` → `Alcance`).
2. **Validação de aprendizado**: filtrar cartas por **Origem** ∩ conjunto do personagem (classe + raça + outras fontes).
3. **Calculadoras**: vida/energia/reações/esquiva conforme fórmulas deste guia.
4. **Versionamento**: raças/classes com sufixo `✅` vs. `?` / pastas **Ideias** — tratar como “canônico” vs. “rascunho” na UI se fizer sentido para a mesa.
5. **HTML Notion**: útil para leitura humana; para **machine-read**, priorizar **CSV + MD**.

---

## 15. Glossário rápido

| Termo | Significado |
|-------|-------------|
| Cena | Unidade de jogo/narrativa até mudar situação/contexto |
| Origem | “Tags” de proveniência que liberam famílias de cartas |
| Baralho de habilidades | Conjunto de onde o personagem pode aprender (por classe) |
| Golpe limpo | Ignora defesas por reação (Esquiva/Bloqueio) nas condições do guia |
| Dano verdadeiro | Ignora Bloqueio; interage com Esquiva conforme texto |
| Morrendo | Estado aos 0 PV com regras de cicatriz e remoção |
| Ligação | Recurso do **Cultista** com a entidade |

---

*Última atualização: consolidado a partir dos arquivos locais do projeto (sem alterar o conteúdo original das pastas de origem).*
