import { corOposta, obterCarta, type Cor, type Estado } from "@xadrez/engine";

export const NOME_COR: Record<Cor, string> = { brancas: "Brancas", pretas: "Pretas" };

/** Número do lance como no xadrez (1 = primeiro lance das brancas e das pretas). */
export const numeroDoLance = (meioLance: number) => Math.max(1, Math.ceil(meioLance / 2));

export function tituloResultado(estado: Estado): string {
  const r = estado.resultado;
  if (!r) return "";
  return r.vencedor ? `${NOME_COR[r.vencedor]} venceram!` : "Empate";
}

export function explicacaoResultado(estado: Estado): string {
  const r = estado.resultado;
  if (!r) return "";
  const lance = `no lance ${numeroDoLance(estado.meioLance)}`;
  switch (r.motivo) {
    case "rei-capturado":
      return `O rei das ${NOME_COR[corOposta(r.vencedor!)].toLowerCase()} foi capturado ${lance}.`;
    case "xeque-mate":
      return `Xeque-mate! O rei das ${NOME_COR[corOposta(r.vencedor!)].toLowerCase()} não tinha como escapar ${lance}.`;
    case "afogamento":
      return `Afogamento: as ${NOME_COR[estado.vez].toLowerCase()} não tinham lance e não estavam em xeque ${lance}.`;
    case "sem-lances":
      return `As ${NOME_COR[corOposta(r.vencedor!)].toLowerCase()} ficaram sem lance legal ${lance}.`;
    case "carta":
      return r.cartaId
        ? `A carta “${obterCarta(r.cartaId).nome}” derrotou as ${NOME_COR[corOposta(r.vencedor!)].toLowerCase()} ${lance}.`
        : `As cartas derrotaram os dois lados ao mesmo tempo ${lance}.`;
    case "50-lances":
      return "Foram 50 lances seguidos sem captura nem lance de peão.";
    case "limite":
      return "A partida chegou ao limite de 200 lances.";
    case "tempo":
      return `O tempo das ${NOME_COR[corOposta(r.vencedor!)].toLowerCase()} acabou.`;
    case "abandono":
      return `As ${NOME_COR[corOposta(r.vencedor!)].toLowerCase()} saíram da partida e não voltaram.`;
    case "desistencia":
      return `As ${NOME_COR[corOposta(r.vencedor!)].toLowerCase()} desistiram.`;
  }
}
