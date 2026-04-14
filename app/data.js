/**
 * Dados de raças e classes (curados a partir do Guia exportado).
 * "tecnicaLivre" = pontos a distribuir nos seis atributos (ex.: Doppelganger).
 * Técnica/Habilidade em exportações antigas → Destreza neste app.
 */
window.GAME_DATA = {
  atributos: ["corpo", "mente", "alma", "destreza", "conhecimento", "foco"],
  racas: [
    { id: "humano", nome: "Humano", attrs: { corpo: 1, mente: 1, alma: 1, destreza: 0, conhecimento: 0, foco: 0 }, vidaBase: 8, energiaBase: 6, origens: ["Humano"], nota: "" },
    { id: "elfo", nome: "Elfo", attrs: { corpo: 0, mente: 0, alma: 0, destreza: 0, conhecimento: 1, foco: 1 }, vidaBase: 8, energiaBase: 8, origens: ["Elfo"], nota: "" },
    { id: "drow", nome: "Drow (Elfo Negro)", attrs: { corpo: 0, mente: 0, alma: 1, destreza: 0, conhecimento: 1, foco: 1 }, vidaBase: 8, energiaBase: 8, origens: ["Drow"], nota: "" },
    { id: "orc", nome: "Orc", attrs: { corpo: 1, mente: 0, alma: 1, destreza: 0, conhecimento: 0, foco: 0 }, vidaBase: 12, energiaBase: 5, origens: ["Orc"], nota: "" },
    { id: "goblin", nome: "Goblin", attrs: { corpo: 0, mente: 0, alma: 1, destreza: 1, conhecimento: 0, foco: 0 }, vidaBase: 6, energiaBase: 6, origens: ["Goblin"], nota: "No guia aparece “1 de Habilidade”; aqui mapeado para Destreza." },
    { id: "asteriano", nome: "Asteriano", attrs: { corpo: 1, mente: 1, alma: 0, destreza: 0, conhecimento: 1, foco: 0 }, vidaBase: 12, energiaBase: 5, origens: ["Asteriano"], nota: "" },
    { id: "draconato", nome: "Draconato", attrs: { corpo: 1, mente: 1, alma: 1, destreza: 0, conhecimento: 0, foco: 0 }, vidaBase: 10, energiaBase: 7, origens: ["Draconato"], nota: "" },
    { id: "infernal", nome: "Infernal (forma parcial)", attrs: { corpo: 1, mente: 0, alma: 1, destreza: 0, conhecimento: 0, foco: 0 }, vidaBase: 6, energiaBase: 6, origens: ["Infernal"], nota: "Forma completa no guia tem outros valores; ajuste manualmente se for o caso." },
    { id: "vampiro", nome: "Vampiro", attrs: { corpo: 1, mente: 0, alma: 0, destreza: 1, conhecimento: 1, foco: 0 }, vidaBase: 10, energiaBase: 6, origens: ["Vampiro"], nota: "“Técnica” do guia → Destreza." },
    { id: "doppelganger", nome: "Doppelganger", attrs: { corpo: 0, mente: 0, alma: 0, destreza: 0, conhecimento: 0, foco: 0 }, vidaBase: 8, energiaBase: 8, origens: ["Doppelganger"], tecnicaLivre: 3, nota: "Distribua os 3 pontos livres nos atributos abaixo." }
  ],
  classes: [
    { id: "mago", nome: "Mago", attrs: { corpo: 0, mente: 0, alma: 1, destreza: 0, conhecimento: 2, foco: 0 }, vidaBase: 6, energiaBase: 8, origens: ["Mago"], baralho: "Magia do Aprendizado" },
    { id: "lutador", nome: "Lutador", attrs: { corpo: 1, mente: 0, alma: 0, destreza: 0, conhecimento: 0, foco: 1 }, vidaBase: 10, energiaBase: 6, origens: ["Lutador"], baralho: "Postura de Luta" },
    { id: "cultista", nome: "Cultista", attrs: { corpo: 0, mente: 0, alma: 1, destreza: 0, conhecimento: 1, foco: 0 }, vidaBase: 8, energiaBase: 8, origens: ["Cultista"], baralho: "Pacto" },
    { id: "cavaleiro", nome: "Cavaleiro", attrs: { corpo: 1, mente: 1, alma: 0, destreza: 0, conhecimento: 0, foco: 0 }, vidaBase: 10, energiaBase: 6, origens: ["Cavaleiro"], baralho: "Caminho do Cavaleiro" },
    { id: "cacador", nome: "Caçador", attrs: { corpo: 0, mente: 0, alma: 0, destreza: 2, conhecimento: 1, foco: 0 }, vidaBase: 8, energiaBase: 7, origens: ["Caçador"], baralho: "Prêmios da Caçada", nota: "“2 de técnica” → Destreza." },
    { id: "berserker", nome: "Berserker", attrs: { corpo: 2, mente: 0, alma: 0, destreza: 0, conhecimento: 0, foco: 0 }, vidaBase: 12, energiaBase: 5, origens: ["Berserker"], baralho: "Modo Berserker" },
    { id: "bardo", nome: "Bardo", attrs: { corpo: 0, mente: 1, alma: 1, destreza: 0, conhecimento: 0, foco: 0 }, vidaBase: 8, energiaBase: 7, origens: ["Bardo"], baralho: "Trilha Sonora" },
    { id: "monge", nome: "Monge", attrs: { corpo: 1, mente: 0, alma: 0, destreza: 0, conhecimento: 0, foco: 1 }, vidaBase: 10, energiaBase: 6, origens: ["Monge"], baralho: "Estado Focado" },
    { id: "gladiador", nome: "Gladiador", attrs: { corpo: 2, mente: 0, alma: 0, destreza: 0, conhecimento: 0, foco: 0 }, vidaBase: 12, energiaBase: 5, origens: ["Gladiador"], baralho: "Glória das Arenas" },
    { id: "alquimista", nome: "Alquimista", attrs: { corpo: 0, mente: 0, alma: 0, destreza: 0, conhecimento: 2, foco: 1 }, vidaBase: 8, energiaBase: 7, origens: ["Alquimista"], baralho: "Troca Equivalente" },
    { id: "cartomante", nome: "Cartomante", attrs: { corpo: 0, mente: 2, alma: 0, destreza: 0, conhecimento: 0, foco: 0 }, vidaBase: 8, energiaBase: 7, origens: ["Cartomante"], baralho: "Destino nas Cartas" },
    { id: "aventureiro", nome: "Aventureiro", attrs: { corpo: 0, mente: 0, alma: 0, destreza: 0, conhecimento: 0, foco: 0 }, vidaBase: 8, energiaBase: 7, origens: ["Aventureiro"], baralho: "Especialização (escolher ramo no guia)", nota: "Atributos dependem do arco (Combatente, Médico…); ajuste manualmente." },
    { id: "enfeiticado", nome: "Enfeitiçado", attrs: { corpo: 0, mente: 0, alma: 2, destreza: 0, conhecimento: 1, foco: 0 }, vidaBase: 8, energiaBase: 8, origens: ["Enfeitiçado"], baralho: "Herança Mágica", nota: "Valores sugeridos; confira subpáginas do guia." },
    { id: "hemomante", nome: "Hemomante", attrs: { corpo: 1, mente: 0, alma: 0, destreza: 1, conhecimento: 1, foco: 0 }, vidaBase: 10, energiaBase: 6, origens: ["Hemomancia"], baralho: "Manipulação do Sangue", nota: "“Técnica” → Destreza." },
    { id: "malandro", nome: "Malandro", attrs: { corpo: 1, mente: 1, alma: 0, destreza: 0, conhecimento: 0, foco: 0 }, vidaBase: 8, energiaBase: 7, origens: ["Malandro"], baralho: "Aprendizado das ruas" },
    { id: "mosqueteiro", nome: "Mosqueteiro", attrs: { corpo: 0, mente: 0, alma: 0, destreza: 0, conhecimento: 1, foco: 1 }, vidaBase: 8, energiaBase: 7, origens: ["Mosqueteiro"], baralho: "Posicionamento Tático" },
    { id: "samurai", nome: "Samurai", attrs: { corpo: 1, mente: 0, alma: 0, destreza: 0, conhecimento: 0, foco: 1 }, vidaBase: 10, energiaBase: 6, origens: ["Samurai"], baralho: "Código de Honra" },
    { id: "xama", nome: "Xamã", attrs: { corpo: 0, mente: 0, alma: 2, destreza: 0, conhecimento: 0, foco: 0 }, vidaBase: 6, energiaBase: 8, origens: ["Xamã"], baralho: "Rituais xamânicos (ver guia)" }
  ]
};
