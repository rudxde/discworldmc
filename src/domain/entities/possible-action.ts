export const PossibleActions = {
    start: 'start',
    stop: 'stop',
    status: 'status',
} as const;

export type PossibleActions = typeof PossibleActions[keyof typeof PossibleActions];
