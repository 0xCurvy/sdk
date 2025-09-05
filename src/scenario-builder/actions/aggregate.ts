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
  private remainingAmount: bigint = 0n;
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
  generateNoteAmountsMap() {
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
  generateAggregationActions(
    inputNotes: SBNote[],
    changeData?: { note: SBNote; changeAmount: bigint }
  ): (SBSequenceItem | SBParallel)[] {
    const previousActions: (SBAction | SBParallel)[] = this.actions;
    const actions: (SBAction | SBParallel)[] = [];
    const outputNotes: SBNote[] = [];

    for (let i = 0; i < inputNotes.length; i += MAX_INPUTS) {
      const inputNotesBatch = inputNotes.slice(i, i + MAX_INPUTS);
      const outputNote = this.generateOutputNote(
        inputNotesBatch.reduce((acc, note) => acc + note.amount, 0n)
      );
      const dummyNote = this.generateOutputNote(0n);

      outputNotes.push(outputNote, dummyNote);

      actions.push({
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

      this.state.notes.push(outputNote);
    }

    if (changeData) {
      const changeNote = this.generateOutputNote(changeData.changeAmount);
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

      this.state.notes.push(changeNote);
    }

    if (actions.length === 1) {
      this.actions = [...previousActions, ...actions];
      return this.actions;
    }

    const parallelAction: SBParallel = {
      type: "parallel",
      actions,
    };

    this.remainingAmount = this.params.targetAmount;
    this.actions = [...previousActions, parallelAction];
    this.inputNotes = [];

    return this.schedule().actions || [];
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
    for (const note of this.state.notes) {
      // Skip used notes
      if (note.isSpent) {
        continue;
      }

      // Found note with the exact amount
      const stringifiedAmount = remainingAmount.toString();
      if (noteAmountsMap[stringifiedAmount] != undefined) {
        inputNotes.push(noteAmountsMap[stringifiedAmount][0]);
        remainingAmount = 0n;

        this.isExecutable = true;
        note.isSpent = true;

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

    return {
      isExecutable: false,
      remainingAmount,
    };
  }
}
