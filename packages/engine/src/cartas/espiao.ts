import { definirCarta } from "../carta.ts";

// O efeito fica fora da carta: a tela e a IA consultam cartasAbertas() para mostrar
// (ou não esconder) as cartas de quem tem esta desvantagem.
export default definirCarta({
  id: "espiao",
  nome: "Espião",
  tipo: "desvantagem",
  peso: 2,
  descricao: "O adversário vê as suas cartas desde o início da partida.",
});
