import { createActor, createMachine, assign, type ActorRefFrom } from 'xstate';
import {
	type ScanEvent,
} from './scan.shared';
import {
	createCycleCountScanItemEngine,
	createDelegatedScanItemState,
	type ScanItemEngine,
} from './scan-item.engine';
import {
	type CycleCount,
	type CycleCountWorkItem,
	normalizeCycleCount,
	validateCycleCountWorkItem,
} from './cycle-count.model';

interface CycleCountContext {
	workItem: CycleCountWorkItem;
	scanItemEngine: ScanItemEngine;
	itemScanCount: number;
	scanItemDone: boolean;
	error: string | null;
}

export interface CycleCountSnapshot {
	state: string;
	workItem: CycleCountWorkItem;
	itemScanCount: number;
	done: boolean;
	error: string | null;
}

function toSnapshot(actor: ActorRefFrom<typeof cycleCountMachine>): CycleCountSnapshot {
	const state = actor.getSnapshot();
	return {
		state: String(state.value),
		workItem: state.context.workItem,
		itemScanCount: state.context.itemScanCount,
		done: state.matches('done'),
		error: state.context.error,
	};
}

const cycleCountMachine = createMachine({
	types: {
		context: {} as CycleCountContext,
		events: {} as ScanEvent,
		input: {} as CycleCountWorkItem,
	},
	id: 'cycleCountEngine',
	initial: 'scanItem',
	context: ({ input }) => ({
		workItem: input,
		scanItemEngine: createCycleCountScanItemEngine(input),
		itemScanCount: 0,
		scanItemDone: false,
		error: null,
	}),
	states: {
		scanItem: createDelegatedScanItemState('done'),
		done: {
			type: 'final',
		},
	},
});

export function createCycleCountEngine(cycleCountInput: CycleCount) {
	const cycleCount = normalizeCycleCount(cycleCountInput);
	validateCycleCountWorkItem(cycleCount);
	const actor = createActor(cycleCountMachine, { input: cycleCount });
	actor.start();

	return {
		send(event: ScanEvent): CycleCountSnapshot {
			actor.send(event);
			return toSnapshot(actor);
		},
		getSnapshot(): CycleCountSnapshot {
			return toSnapshot(actor);
		},
		stop(): void {
			actor.getSnapshot().context.scanItemEngine.stop();
			actor.stop();
		},
	};
}
