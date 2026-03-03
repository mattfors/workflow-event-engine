import { createActor, createMachine, assign, type ActorRefFrom } from 'xstate';

export interface Pick {
	id: string;
	location: string;
	carton: string;
	validItemCodes: string[];
	quantity: number;
}

export type PickInput = Pick;

interface EngineContext {
	pick: Pick;
	itemScanCount: number;
	error: string | null;
}

type ScanEvent = {
	type: 'SCAN';
	value: string;
};

export interface EngineSnapshot {
	state: string;
	pick: Pick;
	itemScanCount: number;
	done: boolean;
	error: string | null;
}

function normalizePick(pickInput: PickInput): Pick {
	return {
		id: pickInput?.id ?? '',
		location: pickInput?.location ?? '',
		carton: pickInput?.carton ?? '',
		validItemCodes: Array.isArray(pickInput?.validItemCodes) ? pickInput.validItemCodes : [],
		quantity: Number.isInteger(pickInput?.quantity) && pickInput.quantity > 0 ? pickInput.quantity : 0,
	};
}

function validatePick(pick: Pick): void {
	if (!pick.id || !pick.location || !pick.carton || pick.validItemCodes.length === 0 || pick.quantity < 1) {
		throw new Error('createPickEngine requires pick with id, location, carton, validItemCodes, and quantity');
	}
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
		input: {} as Pick,
	},
	id: 'pickEngine',
	initial: 'scanLocation',
	context: ({ input }) => ({
		pick: input,
		itemScanCount: 0,
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
		scanItem: {
			on: {
				SCAN: [
					{
						guard: ({ context, event }) => (
							context.pick.validItemCodes.includes(event.value)
							&& context.itemScanCount + 1 >= context.pick.quantity
						),
						target: 'scanCartonRescan',
						actions: assign({
							itemScanCount: ({ context }) => context.itemScanCount + 1,
							error: null,
						}),
					},
					{
						guard: ({ context, event }) => context.pick.validItemCodes.includes(event.value),
						actions: assign({
							itemScanCount: ({ context }) => context.itemScanCount + 1,
							error: null,
						}),
					},
					{
						actions: assign({ error: () => 'Scanned item code is not valid for this pick' }),
					},
				],
			},
		},
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

export function createPickEngine(pickInput: PickInput) {
	const pick = normalizePick(pickInput);
	validatePick(pick);
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
			actor.stop();
		},
	};
}
