import { createActor, createMachine, assign, type ActorRefFrom } from 'xstate';
import {
	type Pick,
	type PickWorkItem,
	normalizePick,
	validatePickWorkItem,
} from './picking.model';
import {
	type ScanEvent,
} from './scan.shared';
import {
	createDelegatedScanItemState,
	createPickScanItemEngine,
	type ScanItemEngine,
} from './scan-item.engine';

interface EngineContext {
	pick: PickWorkItem;
	scanItemEngine: ScanItemEngine;
	itemScanCount: number;
	scanItemDone: boolean;
	error: string | null;
}

export interface EngineSnapshot {
	state: string;
	pick: PickWorkItem;
	itemScanCount: number;
	done: boolean;
	error: string | null;
}

function toSnapshot(actor: ActorRefFrom<typeof machineTemplate>): EngineSnapshot {
	const state = actor.getSnapshot();
	return {
		state: String(state.value),
		pick: state.context.pick,
		itemScanCount: state.context.itemScanCount,
		done: state.matches('done'),
		error: state.context.error,
	};
}

const machineTemplate = createMachine({
	types: {
		context: {} as EngineContext,
		events: {} as ScanEvent,
		input: {} as PickWorkItem,
	},
	id: 'pickEngine',
	initial: 'scanLocation',
	context: ({ input }) => ({
		pick: input,
		scanItemEngine: createPickScanItemEngine(input),
		itemScanCount: 0,
		scanItemDone: false,
		error: null,
	}),
	states: {
		scanLocation: {
			on: {
				SCAN: [
					{
						guard: ({ context, event }) => context.pick.location === event.value,
						target: 'scanCarton',
						actions: assign({ error: null }),
					},
					{
						actions: assign({ error: () => 'Scanned location does not match pick location' }),
					},
				],
			},
		},
		scanCarton: {
			on: {
				SCAN: [
					{
						guard: ({ context, event }) => context.pick.carton === event.value,
						target: 'scanItem',
						actions: assign({ error: null }),
					},
					{
						actions: assign({ error: () => 'Scanned carton does not match pick carton' }),
					},
				],
			},
		},
		scanItem: createDelegatedScanItemState('scanCartonRescan'),
		scanCartonRescan: {
			on: {
				SCAN: [
					{
						guard: ({ context, event }) => context.pick.carton === event.value,
						target: 'done',
						actions: assign({ error: null }),
					},
					{
						actions: assign({ error: () => 'Rescanned carton does not match pick carton' }),
					},
				],
			},
		},
		done: {
			type: 'final',
		},
	},
});

export function createPickEngine(pickInput: Pick) {
	const pick = normalizePick(pickInput);
	validatePickWorkItem(pick);
	const actor = createActor(machineTemplate, { input: pick });
	actor.start();

	return {
		send(event: ScanEvent): EngineSnapshot {
			actor.send(event);
			return toSnapshot(actor);
		},
		getSnapshot(): EngineSnapshot {
			return toSnapshot(actor);
		},
		stop(): void {
			actor.getSnapshot().context.scanItemEngine.stop();
			actor.stop();
		},
	};
}
