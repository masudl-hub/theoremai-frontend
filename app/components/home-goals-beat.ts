import { createSharedValue } from '../lib/shared-value';

/** The beat the goals screen rests nearest: 0 on overview, then one for each beat. */
const beat = createSharedValue(0);

export const setGoalBeat = beat.set;
export const useGoalBeat = beat.use;

/** Whether the editor and the agent are both up, so they appear together and not one by one. */
const ready = createSharedValue(false);

export const setGoalReady = ready.set;
export const useGoalReady = ready.use;
