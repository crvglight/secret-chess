import type { CartaQualquer } from "../carta.ts";
import armadilha from "./armadilha.ts";
import avancoEmMassa from "./avanco-em-massa.ts";
import batalhaDePeoes from "./batalha-de-peoes.ts";
import bispoCamaleao from "./bispo-camaleao.ts";
import bisposTimidos from "./bispos-timidos.ts";
import ansiedade from "./ansiedade.ts";
import cartaNaManga from "./carta-na-manga.ts";
import bomba from "./bomba.ts";
import c4 from "./c4.ts";
import daltonico from "./daltonico.ts";
import f5 from "./f5.ts";
import kamikaze from "./kamikaze.ts";
import regigigas from "./regigigas.ts";
import voanet from "./voanet.ts";
import wallhack from "./wallhack.ts";
import yuumi from "./yuumi.ts";
import capturasObrigatorias from "./capturas-obrigatorias.ts";
import covarde from "./covarde.ts";
import cavalariaPesada from "./cavalaria-pesada.ts";
import cavaloSaltador from "./cavalo-saltador.ts";
import cavalosCansados from "./cavalos-cansados.ts";
import cavalosTimidos from "./cavalos-timidos.ts";
import clt from "./clt.ts";
import centroProibido from "./centro-proibido.ts";
import clone from "./clone.ts";
import congelar from "./congelar.ts";
import contraAtaque from "./contra-ataque.ts";
import damaFragil from "./dama-fragil.ts";
import damaImortal from "./dama-imortal.ts";
import esquerdista from "./esquerdista.ts";
import escudo from "./escudo.ts";
import espiao from "./espiao.ts";
import exercitoPequeno from "./exercito-pequeno.ts";
import femmeFatale from "./femme-fatale.ts";
import fantasma from "./fantasma.ts";
import fronteira from "./fronteira.ts";
import giganteDaColina from "./gigante-da-colina.ts";
import guardaReal from "./guarda-real.ts";
import ilusao from "./ilusao.ts";
import ladoErrado from "./lado-errado.ts";
import lentidao from "./lentidao.ts";
import maldicao from "./maldicao.ts";
import multitasking from "./multitasking.ts";
import necromante from "./necromante.ts";
import odds from "./odds.ts";
import pacifista from "./pacifista.ts";
import passosCurtos from "./passos-curtos.ts";
import peaogonista from "./peaogonista.ts";
import peaoVeloz from "./peao-veloz.ts";
import pecasPesadas from "./pecas-pesadas.ts";
import peoesGuerreiros from "./peoes-guerreiros.ts";
import peoesLentos from "./peoes-lentos.ts";
import powerSpike from "./power-spike.ts";
import prazo from "./prazo.ts";
import promocaoAntecipada from "./promocao-antecipada.ts";
import rainhaDasSombras from "./rainha-das-sombras.ts";
import rainhaPreguicosa from "./rainha-preguicosa.ts";
import recuoTatico from "./recuo-tatico.ts";
import reiGuerreiro from "./rei-guerreiro.ts";
import reiImpaciente from "./rei-impaciente.ts";
import reiMedroso from "./rei-medroso.ts";
import reiPreso from "./rei-preso.ts";
import salarioMinimo from "./salario-minimo.ts";
import segundaChance from "./segunda-chance.ts";
import semRecuo from "./sem-recuo.ts";
import semRoque from "./sem-roque.ts";
import sortudo from "./sortudo.ts";
import sniper from "./sniper.ts";
import spyware from "./spyware.ts";
import teleporte from "./teleporte.ts";
import torresAgeis from "./torres-ageis.ts";
import torresCurtas from "./torres-curtas.ts";
import torresGemeas from "./torres-gemeas.ts";
import trocaDeLugar from "./troca-de-lugar.ts";

/**
 * Para criar uma carta: crie o arquivo nesta pasta e adicione-o a esta lista.
 * Um teste falha se algum arquivo da pasta ficar de fora.
 */
export const CARTAS_OFICIAIS: readonly CartaQualquer[] = [
  // Poderes
  escudo,
  cavaloSaltador,
  peaoVeloz,
  teleporte,
  congelar,
  armadilha,
  trocaDeLugar,
  damaImortal,
  peoesGuerreiros,
  recuoTatico,
  promocaoAntecipada,
  cavalariaPesada,
  torresAgeis,
  reiGuerreiro,
  fantasma,
  avancoEmMassa,
  segundaChance,
  bispoCamaleao,
  guardaReal,
  necromante,
  sniper,
  clone,
  ilusao,
  contraAtaque,
  rainhaDasSombras,
  bomba,
  yuumi,
  c4,
  f5,
  daltonico,
  peaogonista,
  giganteDaColina,
  spyware,
  wallhack,
  powerSpike,
  cartaNaManga,
  odds,
  // Desvantagens
  bisposTimidos,
  rainhaPreguicosa,
  batalhaDePeoes,
  damaFragil,
  capturasObrigatorias,
  semRoque,
  reiPreso,
  cavalosCansados,
  torresCurtas,
  semRecuo,
  pacifista,
  cavalosTimidos,
  peoesLentos,
  centroProibido,
  passosCurtos,
  prazo,
  fronteira,
  exercitoPequeno,
  reiImpaciente,
  pecasPesadas,
  reiMedroso,
  espiao,
  maldicao,
  ladoErrado,
  lentidao,
  kamikaze,
  regigigas,
  ansiedade,
  clt,
  covarde,
  voanet,
  femmeFatale,
  salarioMinimo,
  esquerdista,
  multitasking,
  torresGemeas,
  sortudo,
];

const registro = new Map<string, CartaQualquer>(CARTAS_OFICIAIS.map((c) => [c.id, c]));

/** Registra uma carta fora da lista oficial (útil em testes). */
export function registrarCarta(carta: CartaQualquer): void {
  registro.set(carta.id, carta);
}

export function obterCarta(id: string): CartaQualquer {
  const carta = registro.get(id);
  if (!carta) throw new Error(`Carta desconhecida: ${id}`);
  return carta;
}
