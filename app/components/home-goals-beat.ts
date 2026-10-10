import type { Lines } from '../lib/home-excerpt';
import { createSharedValue } from '../lib/shared-value';

/** The beat the goals screen rests nearest: 0 on overview, then one for each beat. */
const beat = createSharedValue(0);

export const setGoalBeat = beat.set;
export const useGoalBeat = beat.use;

/** The lines of the agent's file a change or a test has just marked, as lines of the whole source. */
const marked = createSharedValue<Lines | undefined>(undefined);

export const setGoalMarked = marked.set;
export const useGoalMarked = marked.use;
