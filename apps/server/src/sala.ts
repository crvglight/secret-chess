// Uma sala de partida online. O servidor é a autoridade: guarda o estado completo
// (com as cartas secretas), valida cada ação com o motor e monta, para cada jogador,
// uma vista sem os segredos do adversário. Esta classe não sabe nada de rede.
import { randomBytes } from "node:crypto";
import {
  aplicarLance,
  CARTAS_OFICIAIS,
  cartasAbertas,
  casasNaNevoa,
  corOposta,
  criarPartida,
  destaquesDasCartas,
  disfarcesDasCartas,
  ERRO_SALA_CHEIA,
  jogarCartaDaMao,
  ladosComVigia,
  motivoBloqueio,
  ocultarCartasDe,
  sortearCartas,
  sortearDraft,
  cartasDoDraft,
  usarPoder,
  type AcaoPartida,
  type CartasDoJogador,
  type ConfigSala,
  type Cor,
  type Estado,
  type FaseSala,
  type OfertaDraft,
  type VistaSala,
} from "@xadrez/engine";

/** A carta Lentidão tira este tempo de quem a tem (mas sobra pelo menos MINIMO_COM_LENTIDAO). */
const TEMPO_LENTIDAO = 60_000;
const MINIMO_COM_LENTIDAO = 30_000;

interface Jogador {
  token: string;
  apelido: string;
  conectado: boolean;
}

interface Relogio {
  /** Tempo de cada lado no momento `desde`. */
  restante: Record<Cor, number>;
  desde: number;
  correndo: Cor | null;
}

export type ResultadoEntrada = { ok: true; cor: Cor; token: string } | { ok: false; erro: string };

const novoToken = () => randomBytes(16).toString("hex");

export class Sala {
  jogadores: Record<Cor, Jogador | null> = { brancas: null, pretas: null };
  fase: FaseSala = "aguardando";
  estado: Estado | null = null;
  inicial: Estado | null = null;
  acoes: AcaoPartida[] = [];
  ofertas: Record<Cor, OfertaDraft> | null = null;
  escolhas: Record<Cor, CartasDoJogador | null> = { brancas: null, pretas: null };
  relogio: Relogio | null = null;
  revanche: Record<Cor, boolean> = { brancas: false, pretas: false };
  ultimaAtividade: number;
  /** Quantas pessoas estão assistindo (o index.ts conta as conexões). */
  espectadores = 0;
  numeroPartida = 0;

  constructor(
    readonly codigo: string,
    readonly config: ConfigSala,
    private readonly agora: () => number = Date.now,
    private readonly rng: () => number = Math.random,
  ) {
    this.ultimaAtividade = agora();
  }

  // ---------------------------------------------------------------------------
  // Entrada, saída e reconexão
  // ---------------------------------------------------------------------------

  /** Entra na sala. Com o token de antes, volta para a mesma cor (reconexão). */
  entrar(apelido: string, token?: string): ResultadoEntrada {
    this.ultimaAtividade = this.agora();
    for (const cor of ["brancas", "pretas"] as const) {
      const j = this.jogadores[cor];
      if (j && token && j.token === token) {
        j.conectado = true;
        return { ok: true, cor, token };
      }
    }
    const livre = this.corLivre();
    if (!livre) return { ok: false, erro: ERRO_SALA_CHEIA };
    const j: Jogador = { token: novoToken(), apelido: apelido.trim() || "Jogador", conectado: true };
    this.jogadores[livre] = j;
    if (this.jogadores.brancas && this.jogadores.pretas && this.fase === "aguardando") this.comecar();
    return { ok: true, cor: livre, token: j.token };
  }

  private corLivre(): Cor | null {
    const ocupadas = (["brancas", "pretas"] as const).filter((c) => this.jogadores[c]);
    if (ocupadas.length === 2) return null;
    if (ocupadas.length === 1) return corOposta(ocupadas[0]!);
    // O primeiro a entrar (quem criou) escolhe a cor.
    if (this.config.cor !== "aleatoria") return this.config.cor;
    return this.rng() < 0.5 ? "brancas" : "pretas";
  }

  /** A cor atual de quem tem este token (muda na revanche, quando as cores trocam). */
  corDe(token: string): Cor | null {
    if (this.jogadores.brancas?.token === token) return "brancas";
    if (this.jogadores.pretas?.token === token) return "pretas";
    return null;
  }

  desconectar(cor: Cor): void {
    const j = this.jogadores[cor];
    if (j) j.conectado = false;
  }

  /** O jogador não voltou a tempo: perde por abandono. */
  abandonar(cor: Cor): void {
    if (this.fase === "jogando" && this.estado && !this.jogadores[cor]?.conectado) {
      this.encerrar({ vencedor: corOposta(cor), motivo: "abandono" });
    }
  }

  // ---------------------------------------------------------------------------
  // Começo da partida (com ou sem draft)
  // ---------------------------------------------------------------------------

  private get comRelogio() {
    return this.config.minutos !== null;
  }

  private comecar(): void {
    this.numeroPartida++;
    this.revanche = { brancas: false, pretas: false };
    this.escolhas = { brancas: null, pretas: null };
    if (this.config.regras === "draft") {
      this.ofertas = sortearDraft(this.rng, CARTAS_OFICIAIS, this.comRelogio);
      this.fase = "draft";
      return;
    }
    this.iniciarPartida(sortearCartas(this.rng, CARTAS_OFICIAIS, this.comRelogio));
  }

  escolherDraft(cor: Cor, escolha: CartasDoJogador): string | null {
    if (this.fase !== "draft" || !this.ofertas) return "Não é hora de escolher cartas.";
    const oferta = this.ofertas[cor];
    if (!escolha.poder || !oferta.poderes.includes(escolha.poder)) return "Esse poder não estava na sua oferta.";
    if (!escolha.desvantagem || !oferta.desvantagens.includes(escolha.desvantagem)) {
      return "Essa desvantagem não estava entre as que você podia dar ao adversário.";
    }
    this.escolhas[cor] = escolha;
    if (this.escolhas.brancas && this.escolhas.pretas) {
      // Cada um fica com o próprio poder e a desvantagem que o adversário escolheu.
      this.iniciarPartida(cartasDoDraft({ brancas: this.escolhas.brancas, pretas: this.escolhas.pretas }));
      this.ofertas = null;
    }
    return null;
  }

  private iniciarPartida(cartas: Record<Cor, CartasDoJogador>): void {
    const { regras, casasEspeciais, minutos } = this.config;
    const estado = criarPartida({
      cartas,
      ...(regras === "mao" ? { maoDeCartas: { rng: this.rng } } : {}),
      ...(regras === "caos" ? { caos: { rng: this.rng } } : {}),
      ...(casasEspeciais ? { casasEspeciais: { rng: this.rng } } : {}),
    });
    this.estado = estado;
    this.inicial = estado;
    this.acoes = [];
    this.fase = "jogando";
    if (minutos === null) {
      this.relogio = null;
      return;
    }
    const tempo = (cor: Cor) => {
      const base = minutos * 60_000;
      // Lentidão: 1 minuto a menos (nunca menos de 30 s).
      return estado.cartas[cor].desvantagem === "lentidao" ? Math.max(MINIMO_COM_LENTIDAO, base - TEMPO_LENTIDAO) : base;
    };
    this.relogio = {
      restante: { brancas: tempo("brancas"), pretas: tempo("pretas") },
      desde: this.agora(),
      correndo: estado.vez,
    };
  }

  // ---------------------------------------------------------------------------
  // Jogo
  // ---------------------------------------------------------------------------

  /** Faz a ação do jogador. Devolve o motivo da recusa, ou null se deu certo. */
  agir(cor: Cor, acao: AcaoPartida): string | null {
    this.ultimaAtividade = this.agora();
    const estado = this.estado;
    if (this.fase !== "jogando" || !estado || estado.resultado) return "A partida não está em andamento.";
    if (this.verificarTempo()) return "O seu tempo acabou.";
    if (estado.vez !== cor) return "Espere a sua vez.";

    let novo: Estado;
    try {
      if (acao.tipo === "carta") novo = jogarCartaDaMao(estado, acao.indice);
      else if (acao.tipo === "poder") novo = usarPoder(estado, acao.alvo);
      else novo = aplicarLance(estado, acao.lance);
    } catch (erro) {
      return acao.tipo === "lance" ? this.motivoDoLance(cor, acao) : erro instanceof Error ? erro.message : "Ação inválida.";
    }

    this.estado = novo;
    this.acoes.push(acao);
    // O relógio só troca de lado quando a vez passa (carta e poder não gastam o lance).
    if (this.relogio && (novo.vez !== cor || novo.resultado)) {
      const agora = this.agora();
      this.relogio.restante[cor] -= agora - this.relogio.desde;
      this.relogio.desde = agora;
      this.relogio.correndo = novo.resultado ? null : novo.vez;
    }
    if (novo.resultado) this.fase = "fim";
    return null;
  }

  /** Por que o lance foi recusado, sem entregar os segredos do adversário. */
  private motivoDoLance(cor: Cor, acao: Extract<AcaoPartida, { tipo: "lance" }>): string {
    const b = motivoBloqueio(this.estado!, acao.lance.de, acao.lance.para);
    if (!b) return "Esse lance não é permitido.";
    if (b.xeque) return "Seu rei está em xeque: este lance não tira o rei do xeque.";
    if (b.casa) return `A casa especial “${b.nome}” impede este lance.`;
    if (b.evento) return `O evento “${b.nome}” impede este lance.`;
    return b.dono === cor ? `Sua carta “${b.nome}” impede este lance.` : "Uma carta do adversário impede este lance.";
  }

  desistir(cor: Cor): void {
    if (this.fase === "jogando" && this.estado && !this.estado.resultado) {
      this.encerrar({ vencedor: corOposta(cor), motivo: "desistencia" });
    }
  }

  /** Quanto tempo o lado tem agora (o relógio dele pode estar correndo). */
  tempoDe(cor: Cor): number {
    const r = this.relogio;
    if (!r) return Infinity;
    return r.restante[cor] - (r.correndo === cor ? this.agora() - r.desde : 0);
  }

  /** Daqui a quantos ms o relógio de quem joga zera (null = não há relógio correndo). */
  msAteAcabarTempo(): number | null {
    const c = this.relogio?.correndo;
    return c ? Math.max(0, this.tempoDe(c)) : null;
  }

  /** Se o tempo de quem joga acabou, encerra a partida. Devolve true se encerrou. */
  verificarTempo(): boolean {
    const c = this.relogio?.correndo;
    if (!c || this.tempoDe(c) > 0) return false;
    this.relogio!.restante[c] = 0;
    this.encerrar({ vencedor: corOposta(c), motivo: "tempo" });
    return true;
  }

  private encerrar(resultado: NonNullable<Estado["resultado"]>): void {
    if (!this.estado) return;
    if (this.relogio?.correndo) {
      const c = this.relogio.correndo;
      this.relogio.restante[c] = Math.max(0, this.tempoDe(c));
      this.relogio.correndo = null;
    }
    this.estado = { ...this.estado, resultado };
    this.fase = "fim";
  }

  /** Revanche: quando os dois pedem, começa outra partida com as cores trocadas. */
  pedirRevanche(cor: Cor): void {
    if (this.fase !== "fim") return;
    this.revanche[cor] = true;
    if (!this.revanche.brancas || !this.revanche.pretas) return;
    this.jogadores = { brancas: this.jogadores.pretas, pretas: this.jogadores.brancas };
    this.estado = null;
    this.inicial = null;
    this.comecar();
  }

  // ---------------------------------------------------------------------------
  // Vista de cada jogador
  // ---------------------------------------------------------------------------

  /**
   * O que cada um vê da sala. O jogador não vê os segredos do adversário; o
   * espectador (espectador = true, cor ignorada) vê as cartas dos dois lados.
   */
  vista(cor: Cor, espectador = false): VistaSala {
    const adversario = corOposta(cor);
    const estado = this.estado;
    const fim = this.fase === "fim";
    const jogador = (c: Cor) => {
      const j = this.jogadores[c];
      return j ? { apelido: j.apelido, conectado: j.conectado } : null;
    };

    let visivel: Estado | null = null;
    let destaques: VistaSala["destaques"] = [];
    if (estado && fim) {
      visivel = estado;
      destaques = destaquesDasCartas(estado);
    } else if (estado) {
      // O espectador vê as cartas dos dois lados; o jogador não vê as do adversário.
      const escondidos: Cor[] = espectador ? [] : [adversario];
      const vigias = ladosComVigia(estado);
      // Vê os segredos de um lado escondido se ele tem a desvantagem Espião ou se o
      // jogador está numa torre de vigia (o espectador não fica em torre nenhuma).
      const veSegredosDe = (dono: Cor) =>
        !escondidos.includes(dono) || cartasAbertas(estado, dono) || (!espectador && vigias.has(corOposta(dono)));

      let oculto = estado;
      for (const lado of escondidos) oculto = ocultarCartasDe(oculto, lado);
      const tabuleiro = oculto.tabuleiro.slice();
      for (const d of disfarcesDasCartas(estado)) {
        const p = tabuleiro[d.casa];
        if (!veSegredosDe(d.dono) && p) tabuleiro[d.casa] = { ...p, tipo: d.tipo };
      }
      // Névoa: a peça escondida parada nela vira "?" na tela. O tipo verdadeiro
      // não sai do servidor (vai como peão), para não dar para descobrir pelo navegador.
      for (const [c, dono] of casasNaNevoa(estado)) {
        const p = tabuleiro[c];
        if (escondidos.includes(dono) && p) tabuleiro[c] = { ...p, tipo: "peao" };
      }
      let mao = oculto.mao;
      if (mao) {
        // Mostra só quantas cartas cada lado escondido tem na mão.
        mao = { ...mao, mao: { ...mao.mao } };
        for (const lado of escondidos) mao.mao[lado] = estado.mao!.mao[lado].map(() => "oculta");
      }
      visivel = {
        ...oculto,
        tabuleiro,
        eventos: estado.eventos.filter((e) => !escondidos.includes(e.cor) || cartasAbertas(estado, e.cor)),
        ...(mao ? { mao } : {}),
      };
      destaques = destaquesDasCartas(estado).filter((d) => d.publico || veSegredosDe(d.dono));
    }

    return {
      codigo: this.codigo,
      config: this.config,
      minhaCor: espectador ? "brancas" : cor,
      espectador,
      espectadores: this.espectadores,
      numeroPartida: this.numeroPartida,
      fase: this.fase,
      jogadores: { brancas: jogador("brancas"), pretas: jogador("pretas") },
      estado: visivel,
      destaques,
      oferta: this.fase === "draft" && this.ofertas && !espectador ? this.ofertas[cor] : null,
      draftEscolhido: { brancas: !!this.escolhas.brancas, pretas: !!this.escolhas.pretas },
      relogio: this.relogio
        ? {
            restante: { brancas: Math.max(0, this.tempoDe("brancas")), pretas: Math.max(0, this.tempoDe("pretas")) },
            correndo: this.relogio.correndo,
          }
        : null,
      revanchePedida: { ...this.revanche },
      final: fim && this.inicial ? { inicial: this.inicial, acoes: this.acoes } : null,
    };
  }
}
