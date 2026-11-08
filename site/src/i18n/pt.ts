import { type Messages, entry } from "./types";

/** A Portuguese noun with what the articles around it need: its gender and number. */
type Noun = { name: string; feminine: boolean; plural?: boolean };

const TREASURES: readonly Noun[] = [
  { name: "Coroa", feminine: true },
  { name: "Joia", feminine: true },
  { name: "Chave", feminine: true },
  { name: "Espada", feminine: true },
  { name: "Escudo", feminine: false },
  { name: "Caveira", feminine: true },
  { name: "Fantasma", feminine: false },
  { name: "Escaravelho", feminine: false },
  { name: "Pássaro", feminine: false },
  { name: "Rato", feminine: false },
  { name: "Tartaruga", feminine: true },
  { name: "Caracol", feminine: false },
  { name: "Livro", feminine: false },
  { name: "Mapa", feminine: false },
  { name: "Pergaminho", feminine: false },
  { name: "Ampulheta", feminine: true },
  { name: "Sino", feminine: false },
  { name: "Troféu", feminine: false },
  { name: "Pena", feminine: true },
  { name: "Concha", feminine: true },
  { name: "Bússola", feminine: true },
  { name: "Moedas", feminine: true, plural: true },
  { name: "Varinha", feminine: true },
  { name: "Telescópio", feminine: false },
];

/** Each seat as the subject of a sentence and after a preposition ("para ● o mais novo"). */
const SEATS = [
  { subject: "● O mais novo", object: "● o mais novo" },
  { subject: "■ Jogador 2", object: "■ Jogador 2" },
  { subject: "▲ Jogador 3", object: "▲ Jogador 3" },
  { subject: "◆ Jogador 4", object: "◆ Jogador 4" },
];

const noun = (id: number) => entry(TREASURES, id, "treasure");
const seat = (id: number) => entry(SEATS, id, "seat");
/** The definite article, which is also the object pronoun after a verb: "a", "o", "as", "os". */
const article = (n: Noun) => `${n.feminine ? "a" : "o"}${n.plural === true ? "s" : ""}`;
const plural = (n: Noun) => (n.plural === true ? "s" : "");
/** "a Coroa" */
const the = (id: number) => `${article(noun(id))} ${noun(id).name}`;
/** "à Coroa", "ao Mapa": a + article. */
const toThe = (id: number) => {
  const n = noun(id);
  return `${n.feminine ? "à" : "ao"}${plural(n)} ${n.name}`;
};
/** "da Coroa", "do Mapa": de + article. */
const ofThe = (id: number) => {
  const n = noun(id);
  return `${n.feminine ? "da" : "do"}${plural(n)} ${n.name}`;
};
const count = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const TITLE = "Antes que o Labirinto Caia";

export const pt: Messages = {
  htmlLang: "pt-PT",
  title: TITLE,
  turns: (n) => count(n, "jogada", "jogadas"),
  treasure: (id) => noun(id).name,
  pause: "Pausar",
  play: "Continuar",
  hud: { allFound: "Completo", turnOf: (turn, total) => `Jogada ${turn} de ${total}` },
  live: {
    intro: (players, t) => `${players} jogadores, um só alvo para todos: ${the(t)}.`,
    reach: (s, t) => `${seat(s).subject} consegue chegar ${toThe(t)}.`,
    push: (s, t, next) =>
      `${seat(s).subject} não chega ${toThe(t)}, por isso empurra-${article(noun(t))} para ${seat(next).object}.`,
    closer: (s, t) => `${seat(s).subject} ainda não chega ${toThe(t)}, por isso aproxima-se.`,
    cannot: (s, t) => `${seat(s).subject} não consegue chegar ${toThe(t)} nesta jogada.`,
    found: (t, found, total) => `Encontraram ${the(t)}. ${found} de ${total}.`,
    won: (total, spare) =>
      spare === 0
        ? `Encontraram os ${total} tesouros mesmo na última jogada. Ganham todos.`
        : `Encontraram os ${total} tesouros com ${count(spare, "jogada", "jogadas")} de sobra. Ganham todos.`,
    lost: (left) => `O labirinto desabou com ${count(left, "tesouro", "tesouros")} por encontrar.`,
  },
  oneTurn: {
    push: "1 · Empurrar",
    walk: "2 · Andar",
    collect: (t) => `3 · Apanhar ${the(t)}`,
    nothing: "3 · Nada para apanhar nesta jogada",
    marker: (left) => `4 · O marcador avança: ${left === 1 ? "falta" : "faltam"} ${left}`,
  },
  sacrifice: {
    step: (step, of) => `${step} de ${of}`,
    needs: (t) => `● precisa ${ofThe(t)}, mas nenhum empurrão lhe abre caminho até lá.`,
    pushesFor: (t) => `Por isso, ● joga para o ■ e deixa ${the(t)} a um empurrão dele.`,
    opens: "Vez do ■. Um empurrão abre o caminho.",
    collects: (t) => `■ apanha ${the(t)}. Mais um tesouro para a equipa.`,
  },
  chart: {
    rows: {
      shared: "Um só monte, cartas viradas para baixo",
      personal: "Um monte para cada um, viradas para baixo",
      faceUp: "Um só monte, todas as cartas viradas para cima",
      noHelp: "Um só monte, viradas para baixo, ninguém ajuda",
    },
    ours: "estas regras",
    figures: (typical, bad, sacrifices) =>
      `típico ${typical} · mau ${bad} · ${sacrifices.toFixed(1).replace(".", ",")} sacrifícios/jogo`,
    collapseAt: (turn) => `Desaba às ${turn}`,
    unit: "Jogadas necessárias",
  },
  text: {
    "lang.aria": "Idioma",
    "hero.kicker": "Regras cooperativas da casa para o jogo do labirinto deslizante",
    "hero.title1": "Antes que o Labirinto",
    "hero.title2": "Caia",
    "hero.lede":
      "Jogam todos do mesmo lado. Encontrem os 12 tesouros antes que o labirinto desabe. Se não conseguires chegar ao tesouro, empurra o labirinto para que o jogador seguinte consiga.",
    "hero.players": "2–4 jogadores",
    "hero.age": "A partir dos 6 anos",
    "hero.time": "Cerca de 20 min",
    "hero.pile": "Um só monte",
    "hero.legend": "Peões no tabuleiro",
    "hero.kid": "● O mais novo, que faz as suas próprias jogadas",
    "hero.adults": "■ ▲ Os adultos, que preparam o terreno ao jogador seguinte",
    "hero.target": "Disco preto, anel tracejado: o tesouro que todos procuram",
    "hero.faded": "Esbatido: já encontrado",
    "fig1.aria": "Um jogo a três que se joga sozinho",
    "fig1.label": "Fig. 1 · Jogo ao vivo, 3 jogadores",
    "fig1.board": "Tabuleiro do labirinto, sete por sete, com três peões",
    "fig1.hunting": "Alvo",
    "fig1.found": "Encontrados",
    "fig1.left": "Jogadas restantes",
    "setup.kicker": "Antes de começar",
    "setup.title": "Preparação",
    "setup.s1.title": "Monta o labirinto",
    "setup.s1.body": "Baralha as peças soltas e põe-nas no tabuleiro como de costume. Sobra uma peça: é a peça extra.",
    "setup.s2.title": "Faz um monte de 12",
    "setup.s2.body":
      "Baralha as cartas de tesouro e tira 12, viradas para baixo, para um único monte. As restantes voltam para a caixa.",
    "setup.s3.title": "Vira a carta de cima",
    "setup.s3.body": "Esse é o tesouro que toda a mesa procura. Deixa a carta virada para cima, onde todos a possam ver.",
    "setup.s4.title": "Peões nos cantos",
    "setup.s4.body": "Um peão por jogador nos cantos de partida. Começa o jogador mais novo.",
    "setup.s5.title": "Prepara a pista do desabamento",
    "setup.s5.body":
      "26 casas para 3 ou 4 jogadores, 28 para 2. Serve uma fila de moedas ou uns riscos numa folha. O marcador começa no início.",
    "setup.win.label": "Ganham",
    "setup.win.title": "Os 12 encontrados",
    "setup.win.body": "Assim que o 12.º tesouro é apanhado, ganham todos juntos.",
    "setup.lose.label": "Perdem",
    "setup.lose.title": "O labirinto cai",
    "setup.lose.body":
      "Se o marcador chegar à última casa e ainda houver tesouros por encontrar, o labirinto desaba.",
    "setup.note":
      "Só se usam 12 dos 24 tesouros, para que o jogo caiba em cerca de 20 minutos. Cada tesouro leva umas duas jogadas: uma para o encontrar e, muitas vezes, outra para o preparar.",
    "turn.kicker": "À vez, à volta da mesa",
    "turn.title": "Uma jogada",
    "turn.s1.must": "Obrigatório",
    "turn.s1.title": "Empurrar",
    "turn.s1.body":
      "Empurra a peça extra para dentro em qualquer seta, virada como quiseres. A peça que sai do outro lado passa a ser a nova peça extra. Não a podes empurrar logo de volta por onde o jogador anterior a fez sair.",
    "turn.s2.must": "Opcional",
    "turn.s2.title": "Andar",
    "turn.s2.body":
      "Move o teu peão quanto quiseres pelos caminhos abertos, ou fica onde estás. Os peões não se bloqueiam uns aos outros.",
    "turn.s3.must": "Se conseguires",
    "turn.s3.title": "Apanhar",
    "turn.s3.body":
      "Termina o movimento no tesouro virado para cima e está encontrado. Qualquer jogador o pode apanhar. Põe a carta de lado e vira a seguinte.",
    "turn.s4.must": "Sempre",
    "turn.s4.title": "O labirinto treme",
    "turn.s4.body": "Avança o marcador do desabamento uma casa, quer se tenha encontrado alguma coisa, quer não.",
    "fig2.aria": "Uma jogada, passo a passo",
    "fig2.label": "Fig. 2 · Uma jogada",
    "fig2.board": "Tabuleiro do labirinto com um empurrão, um movimento e um tesouro apanhado",
    "sac.kicker": "O coração do jogo cooperativo",
    "sac.title": "Não chegas lá? Prepara o jogador seguinte",
    "fig3.aria": "Um jogador prepara o seguinte",
    "fig3.label": "Fig. 3 · O sacrifício",
    "fig3.board": "Tabuleiro do labirinto em que um jogador empurra para que o seguinte possa apanhar o tesouro",
    "sac.lede":
      "O teu empurrão fica no tabuleiro para o jogador seguinte. Se nenhum empurrão te levar ao tesouro, usa a tua jogada para o aproximar dele.",
    "sac.tip1":
      "Olha primeiro para o peão do jogador seguinte. Que linha ou coluna pode levar o tesouro até ao caminho dele?",
    "sac.tip2":
      "Empurrar o tesouro para a borda também é bom. Se acabar na peça extra, o jogador seguinte pode empurrá-lo para dentro mesmo ao seu lado.",
    "sac.tip3": "Pensem em voz alta. Todos veem o alvo, por isso a mesa inteira pode ajudar a encontrar o empurrão.",
    "sac.tip4":
      "Dá vitórias fáceis ao jogador mais novo: um tesouro que já esteja no caminho dele, para que só precise de olhar para o tabuleiro tal como está.",
    "sac.note":
      "Nas simulações, uma boa mesa faz cerca de 3 destes sacrifícios por jogo. São eles que tornam possível vencer o desabamento.",
    "rules.kicker": "Pormenores",
    "rules.title": "É bom saber",
    "rules.r1.label": "Empurrar sempre",
    "rules.r1.body": "Empurrar não é opcional, mesmo que estrague um bom caminho.",
    "rules.r2.label": "Não há volta atrás",
    "rules.r2.body": "Não podes empurrar a peça extra de volta por onde o jogador anterior acabou de a fazer sair.",
    "rules.r3.label": "Fora do tabuleiro",
    "rules.r3.body": "Um peão empurrado para fora do tabuleiro volta a entrar na peça nova, no outro extremo dessa fila.",
    "rules.r4.label": "Tesouro na peça extra",
    "rules.r4.body": "Não pode ser apanhado até alguém o voltar a empurrar para dentro do labirinto.",
    "rules.r5.label": "Casas partilhadas",
    "rules.r5.body": "Pode haver vários peões na mesma peça.",
    "rules.r6.label": "Um por jogada",
    "rules.r6.body": "Só conta o tesouro virado para cima, e só se terminares o movimento em cima dele.",
    "diff.kicker": "Afinar o desabamento",
    "diff.title": "Quão difícil deve ser?",
    "diff.intro":
      "Probabilidade de encontrar todos os tesouros antes do desabamento. O mais novo faz as suas próprias jogadas; os outros jogadores ajudam como se explica acima.",
    "diff.th.game": "Jogo",
    "diff.th.treasures": "Tesouros",
    "diff.th.collapse": "Desaba após",
    "diff.th.p2": "2 jogadores",
    "diff.th.p3": "3 jogadores",
    "diff.th.p4": "4 jogadores",
    "diff.quick": "Rápido",
    "diff.standard": "Normal",
    "diff.standard2": "Normal, 2 jogadores",
    "diff.harder": "Mais difícil",
    "diff.gentle": "Suave: planeiem juntos cada jogada",
    "diff.note":
      "Uma jogada é a vez de um jogador, não uma volta completa à mesa. A cerca de 45 segundos por jogada, 26 jogadas são 20 minutos. Cronometrem o primeiro jogo: se as jogadas demorarem mais, joguem o Rápido.",
    "why.kicker": "1000 jogos simulados por configuração, 720 configurações",
    "why.title": "Porquê estas regras",
    "why.intro":
      "Jogadas necessárias para encontrar 12 tesouros com 3 jogadores. A barra é um jogo típico; a linha vai até um jogo mau (1 jogo em cada 10 demora mais).",
    "why.chart": "Jogadas necessárias por variante das regras",
    "why.f1.title": "Um só monte.",
    "why.f1.body":
      "Com um monte para cada um, o jogo dura tanto quanto o monte mais lento, normalmente o do jogador mais novo. Os jogos maus passam das 50 jogadas.",
    "why.f2.title": "Cartas viradas para baixo.",
    "why.f2.body":
      "Com todas as cartas viradas para cima, há quase sempre alguma coisa ao alcance, e ninguém precisa de ajudar ninguém. Um só alvo para todos mantém a mesa a trabalhar em conjunto, e é o mais fácil de ter na cabeça para uma criança de 6 anos.",
    "why.f3.title": "Ajudar faz diferença.",
    "why.f3.body":
      "A mesma mesa, com cada um a jogar só para si, precisa de uma mediana de 29 jogadas em vez de 24, e perde a maioria dos jogos com o desabamento às 26 jogadas.",
    "why.f4.title": "Todos têm o seu momento.",
    "why.f4.body":
      "Num jogo a dois, o mais novo apanha 58% dos tesouros, porque o outro jogador está sempre a preparar-lhe o caminho.",
    "foot.name.label": "Título",
    "foot.name": TITLE,
    "foot.players.label": "Jogadores",
    "foot.players": "2–4, a partir dos 6 anos",
    "foot.treasures.label": "Tesouros",
    "foot.treasures": "12 cartas, um só monte, viradas para baixo",
    "foot.collapse.label": "Desabamento",
    "foot.collapse": "26 jogadas (28 a dois)",
  },
};
