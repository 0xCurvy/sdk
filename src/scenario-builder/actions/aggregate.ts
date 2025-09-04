import { SBAction, SBNote, SBState } from "@/types/scenario-builder";

const MAX_INPUTS = 10;
// const MAX_OUTPUTS = 2; // TODO: Make output generation dynamic

type AggregationActionParams = {
    recipientBabyJubJubPublicKey: string;
    recipientK: string;
    recipientV: string;
    targetAmount: bigint;
    targetToken: bigint;
}

export class AggregateAction {
    private state: SBState;
    private params: AggregationActionParams;
    public isExecutable: boolean = false;


    constructor(state: SBState, params: AggregationActionParams) {
        this.state = state;
        this.params = params;
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
        }
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
    generateAggregationActions(inputNotes: SBNote[], changeData?: { note: SBNote, changeAmount: bigint }) {
        const actions: SBAction[] = [];
        const outputNotes: SBNote[] = [];

        for (let i = 0; i < inputNotes.length; i += MAX_INPUTS) {
            const inputNotesBatch = inputNotes.slice(i, i + MAX_INPUTS);
            const outputNote = this.generateOutputNote(this.params.targetAmount);
            const dummyNote = this.generateOutputNote(0n);

            outputNotes.push(outputNote, dummyNote);

            actions.push({
                type: "action",
                action: "aggregate",
                params: {
                    inputNotes: inputNotesBatch,
                    outputNotes: [outputNote, dummyNote]
                },
            });
        }

        if (changeData) {
            const changeNote = this.generateOutputNote(changeData.changeAmount);
            const changeDummyNote = this.generateOutputNote(0n);
            outputNotes.push(changeNote)
            actions.push({
                type: "action",
                action: "aggregate",
                params: {
                    inputNotes: [changeData.note],
                    outputNotes: [changeNote, changeDummyNote],
                },
            });
        }

        return {
            newNotes: outputNotes,
            actions,
        }
    }

    /**
     * Schedule actions for aggregation(s) that result in the generation of the output note with a given amount
     */
    schedule() {
        let remainingAmount = this.params.targetAmount;
        const inputNotes: SBNote[] = [];

        const noteAmountsMap = this.generateNoteAmountsMap();

        // Sort notes
        this.state.notes.sort((a, b) => a.amount > b.amount ? 1 : -1);

        // Construct a set of input notes that will be used for aggregation
        for (const note of this.state.notes) {
            
            // Skip used notes
            if (note.isSpent) {
                continue;
            }

            // Found note with the exact amount
            if (noteAmountsMap[remainingAmount.toString()].length > 0) {
                inputNotes.push(noteAmountsMap[note.amount.toString()][0]);
                remainingAmount = 0n;

                this.isExecutable = true; 
                note.isSpent = true;

                const { newNotes, actions } = this.generateAggregationActions(inputNotes);

                return {
                    isExecutable: true,
                    newNotes,
                    actions,
                }
            }

            if (note.amount > remainingAmount) {
                this.isExecutable = true; 
                note.isSpent = true;

                const changeData = {
                    note,
                    changeAmount: note.amount - remainingAmount,
                }

                const { newNotes, actions } = this.generateAggregationActions(inputNotes, changeData);

                return {
                    isExecutable: true,
                    newNotes,
                    actions,
                }
            }

            if (note.amount < remainingAmount) {
                inputNotes.push(note);
                note.isSpent = true;
                remainingAmount -= note.amount;
            }
        }

        return {
            isExecutable: false,
            inputNotes,
            remainingAmount,
        }

    }
}