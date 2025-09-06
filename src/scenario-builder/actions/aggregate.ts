// TODO: ako saljemo nekome drugom (intent je curvy handle)
//      onda bi trebali da to mozemo da uradimo ako je moguce kroz jednu agregaciju
//      trenutno je stvar da prvo u jednoj agregiramo na nasu, pa u drugoj na tudju "note" adresu
import {
  SBAction,
  SBNote,
  SBSequenceItem,
  SBState,
  SBParallel,
} from "@/types/scenario-builder";

const MAX_INPUTS = 10;
// const MAX_OUTPUTS = 2; // TODO: Make output generation dynamic

type AggregationActionParams = {
  recipientBabyJubJubPublicKey: string;
  recipientK: string;
  recipientV: string;
  targetAmount: bigint;
  targetToken: bigint;
};

export class AggregateAction {
  private state: SBState;
  private params: AggregationActionParams;
  public isExecutable: boolean = false;
  private inputNotes: SBNote[] = [];
  // Agregacija je uradila nesto ali joj fali jos 10 tokena,
  // sustinski ovo znaci da bi se kasnije u schedulu videlo da treba da se uradi deposit
  private remainingAmount: bigint = 0n; // Koliko jos treba da se dopuni
  private actions: (SBAction | SBParallel)[] = [];

  constructor(state: SBState, params: AggregationActionParams) {
    this.state = state;
    this.params = params;
    this.remainingAmount = params.targetAmount;
  }

  /**
   * Generate new output note as a result of aggregation
   * @param amount
   * @param token
   * @returns
   */
  generateOutputNote(amount: bigint): SBNote {
    return {
      owner: {
        ownerBabyJub: this.params.recipientBabyJubJubPublicKey,
        sharedSecretData: {
          K: this.params.recipientK,
          V: this.params.recipientV,
        },
      },
      amount,
      token: this.params.targetToken,
      isSpent: false,
    };
  }

  /**
   * Generate notes lookup table based on amounts
   * @returns
   */
  generateNoteAmountsMap() { // todo: potencijalno ovde treba da isfiltriramo samo unspent?
    return this.state.notes.reduce((acc: Record<string, SBNote[]>, note) => {
      if (acc[note.amount.toString()] === undefined) {
        acc[note.amount.toString()] = [];
      }
      acc[note.amount.toString()].push(note);
      return acc;
    }, {});
  }

  /**
   * Generate actions for aggregation
   * @param inputNotes
   * @param changeData
   * @returns
   */
  /*
   * Ova funkcija uzima niz inputNote-ova
   * i instrukcije da li od poslednjeg note-a treba da vrati neku lovu nazad
   * zatim generise onoliko Aggregate komandi koliko treba da bismo mogli
   * da imamo agregacije od po 10 note-ova
   */
  generateAggregationActions(
    inputNotes: SBNote[],
    changeData?: { note: SBNote; changeAmount: bigint }
  ): (SBSequenceItem | SBParallel)[] {
    const previousActions: (SBAction | SBParallel)[] = this.actions;
    const actions: (SBAction | SBParallel)[] = [];
    const outputNotes: SBNote[] = [];

    // ovde loopujemo koliko odvojenih agregacija po broju input noteova treba da radimo
    // input noteovi su nam ovde sustinski svi koji nam odgovaraju po njihovim amountovima
    for (let i = 0; i < inputNotes.length; i += MAX_INPUTS) {
      // ovde izvlacimo sve inpute iz trenutnog batcha (trenutna loop iteracija)
      const inputNotesBatch = inputNotes.slice(i, i + MAX_INPUTS);
      // ovde sabiramo sve inpput noteove iz trenutnog batcha i generisemo od njih 1 output note
      const outputNote = this.generateOutputNote(
        inputNotesBatch.reduce((acc, note) => acc + note.amount, 0n)
      );
      const dummyNote = this.generateOutputNote(0n);

      // svaki put moramo da imamo tacno 2 output note-a drugi je change ili dummy
      outputNotes.push(outputNote, dummyNote);

      // ovde u niz odvojenih agregacija stavljamo ovu konkretnu agregaciju
      // i obelezavamo da treba da se preskoci ukoliko tacno gadjamo amount
      // jer to znaci da ne moramo nista da agregiramo sve je vec tu
      // ali razlog zasto uopste nju ubacujemo sa shouldSkip a ne preskacemo
      // ubacivanje u potpunosti je taj sto ipak zelimo da sacuvamo informaciju
      // da je to jedan korak u agregacijama gde samo treba da se "preslika" note
      actions.push({ // action je sustinski jedna agregacija odnosno jedan poziv ka komandi za agregaciju
        type: "action",
        action: "aggregate",
        shouldSkip:
          inputNotesBatch.length === 1 &&
          inputNotesBatch[0].amount === this.params.targetAmount,
        params: {
          inputNotes: inputNotesBatch,
          outputNotes: [outputNote, dummyNote],
        },
      });

      // ovde mutiratmo stejt jer imamo novu agregiranu note
      this.state.notes.push(outputNote);
    }

    // ukoliko smo u ovoj funkjciji prosledili da imamo i kusur
    // odnosno da input noteovi prosledjeni premasuju targetAmount, onda
    // to eksplicitno ovde znamo i rokamo po tome
    // TODO: OPTIMIZACIJA 1 Ovde mozemo da optimziujemo da ne pravimo novu agregaciju
    //        za change, vec da je gore stavljamo zapraov umesto dummy note-a.
    //        ali ovde moramo da vodimo racuna da sam changeData.note  moze da stane
    //        u niz inputa, odnosno pri startu bismo samo konkatenirala ta 2
    //        i pustili da batching loop uradi svoje
    if (changeData) {
      // genersimo novi output note od tacnog iznosa kusura
      const changeNote = this.generateOutputNote(changeData.changeAmount);
      // pravimo potpuno novu agregaciju za ovaj kusur, nije optimalno imamo todo gore
      const changeDummyNote = this.generateOutputNote(0n);
      outputNotes.push(changeNote);
      actions.push({
        type: "action",
        action: "aggregate",
        shouldSkip: false,
        params: {
          inputNotes: [changeData.note],
          outputNotes: [changeNote, changeDummyNote],
        },
      });

      // ovde mutiramo state jer imamo novi changenote
      this.state.notes.push(changeNote);
    }

    // Ako smo u ovom koraku videli da imamo samo jednu agregaciju,
    // onda cemo da vratimo sve akcije jer smo zavrsili pricu.
    if (actions.length === 1) {
      this.actions = [...previousActions, ...actions];
      return this.actions;
    }

    // Ukoliko ipak imamo vise akcija, onda znamo da mozemo da ih
    // izvrsimo u paraleli

   // Pravimo paralelni step
    const parallelAction: SBParallel = {
      type: "parallel",
      actions,
    };

    // Remaining amount postavljamo nazad na targetAmount
    // samo sto cemo ovaj put imati manji broj noteova jer smo uradili neke
    // agregacije. Ovo je sustinski ukrupnjavanje svaki poziv ovoj funkciji.
    // Sa ciljem da na kraju zavrsi sa jednim noteom sa targetAmountom (uspeesna agregacija)
    this.remainingAmount = this.params.targetAmount;
    // Appendujemo na sve agregacije i ovu paralelnu akciju agregacija
    this.actions = [...previousActions, parallelAction];
    // Input noteove cistimo jer zelimo da opet izgradimo noteAmountsMap na osnovu stejta
    // koji je u medjuvremenu mutiran
    this.inputNotes = [];

    // ovde zovemo rekurzivno, a posto imamo this.actions koji se appenduje
    // tako ce rekurzivno da se puni
    return this.schedule().actions || []; // ovo je zapravo rekurzija
  }

  /**
   * Schedule actions for aggregation(s) that result in the generation of the output note with a given amount
   */
  schedule() {
    let remainingAmount = this.remainingAmount;
    const inputNotes: SBNote[] = this.inputNotes;

    const noteAmountsMap = this.generateNoteAmountsMap();

    // Sort notes
    this.state.notes.sort((a, b) => (a.amount > b.amount ? 1 : -1));

    // Construct a set of input notes that will be used for aggregation
    // ovde sustinski gledamo u 3 ifa:
    //  - koji note tacno zadovoljava ciulj
    //  - koji note premasuje cilj, da ga razbijemo i setujemo changeData za agregacij(e)
    //  - koji note podbacuje cilj, da bismo ga iskoristlii i nastavili u sledecu iteraciju petlje
    for (const note of this.state.notes) {
      // Skip used notes
      if (note.isSpent) {
        continue;
      }

      // Found note with the exact amount
      const stringifiedAmount = remainingAmount.toString();
      if (noteAmountsMap[stringifiedAmount] != undefined) {
        inputNotes.push(noteAmountsMap[stringifiedAmount][0]); // ovde treba da izvucemo pprvi unspent, za svaki slucaj provera
        remainingAmount = 0n; // ovo potencijalno mozemo na kraju u svakom slucaju da umanjimo za zbir input noteova da bude mozda jasnije

        this.isExecutable = true; // executable znaci da ovo treba da se izvrsi
        note.isSpent = true; // is spent znaci da necemo moci da trosimo ovu adresu u buducnosti

        const actions = this.generateAggregationActions(inputNotes);

        return {
          isExecutable: true,
          actions,
        };
      }

      if (note.amount > remainingAmount) {
        this.isExecutable = true;
        note.isSpent = true;

        const changeData = {
          note,
          changeAmount: note.amount - remainingAmount,
        };

        // ovde se realno zavrsava
        const actions = this.generateAggregationActions(inputNotes, changeData);

        return {
          isExecutable: true,
          actions,
        };
      }

      if (note.amount < remainingAmount) {
        inputNotes.push(note);
        note.isSpent = true;
        remainingAmount -= note.amount;
      }
    }

    this.inputNotes = inputNotes;
    this.remainingAmount = remainingAmount;

    // Ovo je sustinski neuspeh da se zavrsi agregacija
    // koristeci samo noteove, vec ovo ce da bubble upuje
    // i da obavesti ostatak sistema da moramo da dovucemo jos sredstava sa CSUCa
    return {
      isExecutable: false,
      remainingAmount,
    };
  }
}
