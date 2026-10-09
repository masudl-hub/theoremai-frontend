import { createSharedValue } from '../lib/shared-value';

/** The beat the goals screen rests nearest: 0 on overview, then one for each beat. */
const beat = createSharedValue(0);

export const setGoalBeat = beat.set;
export const useGoalBeat = beat.use;
