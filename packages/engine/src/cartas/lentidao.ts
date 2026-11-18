import { definirCarta } from "../carta.ts";

/** Quanto tempo a menos no relógio (o relógio chega com o modo online). */
export const TEMPO_A_MENOS_MS = 60_000;

export default definirCarta({
  id: "lentidao",
  nome: "Lentidão",
  tipo: "desvantagem",
  peso: 2,
  descricao: "Você começa com 1 minuto a menos no relógio (só em partidas com relógio).",
  exigeRelogio: true,
});
