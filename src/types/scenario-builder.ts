export type SBNote = {
    owner: {
        ownerBabyJub: string;
        sharedSecretData: {
            K: string;
            V: string;
        };
    };
    amount: bigint;
    token: bigint;
    isSpent: boolean;
};

export type SBCsucBalance = {
    address: string;
    amount: bigint;
    token: bigint;
    isSpent: boolean;
};

export type SBStealthAddressBalance = SBCsucBalance;

export type SBState = {
    notes: SBNote[];
    csucBalances: SBCsucBalance[];
    stealthAddressBalances: SBStealthAddressBalance[];
}

export type SBSequenceItem = SBAction | SBParallel;

export type SBAction = {
    type: "action";
    shouldSkip: boolean;
    action: string;
    params: any; // TODO: Define aplicable types
}

export type SBParallel = {
    type: "parallel";
    actions: SBSequenceItem[];
}

export type SBSequence = {
    type: "serial";
    actions: SBSequenceItem[];
}