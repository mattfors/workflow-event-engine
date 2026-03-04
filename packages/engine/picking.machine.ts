import { createActor, createMachine, assign, type ActorRefFrom } from 'xstate';
import {
	type Pick,
	type PickWorkItem,
	isValidPickWorkItem,
	normalizePick,
} from './picking.model';

interface PickingContext {
	assignedPicksById: Record<string, PickWorkItem>;
	pickOrder: string[];
	activePickId: string | null;
	error: string | null;
}

type PickingEvent =
	| {
		type: 'HYDRATE_PICKS';
		picks: Pick[];
	}
	| {
		type: 'START_PICK';
		pickId: string;
	};

export interface PickingSnapshot {
	state: string;
	assignedPicks: PickWorkItem[];
	activePickId: string | null;
	activePick: PickWorkItem | null;
	error: string | null;
}

function hydratePicks(incomingPicks: Pick[]): {
	nextById: Record<string, PickWorkItem>;
	nextOrder: string[];
} {
	const nextById: Record<string, PickWorkItem> = {};
	const nextOrder: string[] = [];

	for (const pickInput of incomingPicks) {
		const pick = normalizePick(pickInput);
		if (!isValidPickWorkItem(pick)) {
			continue;
		}

		nextById[pick.id] = pick;
		if (!nextOrder.includes(pick.id)) {
			nextOrder.push(pick.id);
		}
	}

	return { nextById, nextOrder };
}

function toSnapshot(actor: ActorRefFrom<typeof pickingMachine>): PickingSnapshot {
	const state = actor.getSnapshot();
	const assignedPicks = state.context.pickOrder
		.map((pickId) => state.context.assignedPicksById[pickId])
		.filter((pick): pick is PickWorkItem => Boolean(pick));

	return {
		state: String(state.value),
		assignedPicks,
		activePickId: state.context.activePickId,
		activePick: state.context.activePickId
			? state.context.assignedPicksById[state.context.activePickId] ?? null
			: null,
		error: state.context.error,
	};
}

const pickingMachine = createMachine({
	types: {
		context: {} as PickingContext,
		events: {} as PickingEvent,
	},
	id: 'picking',
	initial: 'idle',
	on: {
		HYDRATE_PICKS: {
			target: '.ready',
			actions: assign(({ context, event }) => {
				const { nextById, nextOrder } = hydratePicks(event.picks);
				const activePickId = context.activePickId && nextById[context.activePickId]
					? context.activePickId
					: null;
				return {
					assignedPicksById: nextById,
					pickOrder: nextOrder,
					activePickId,
					error: null,
				};
			}),
		},
	},
	context: {
		assignedPicksById: {},
		pickOrder: [],
		activePickId: null,
		error: null,
	},
	states: {
		idle: {
			on: {},
		},
		ready: {
			on: {
				START_PICK: [
					{
						guard: ({ context, event }) => Boolean(context.assignedPicksById[event.pickId]),
						target: 'active',
						actions: assign({
							activePickId: ({ event }) => event.pickId,
							error: null,
						}),
					},
					{
						actions: assign({ error: ({ event }) => `Pick ${event.pickId} is not assigned` }),
					},
				],
			},
		},
		active: {
			on: {
				HYDRATE_PICKS: {
					guard: () => false,
				},
				START_PICK: [
					{
						guard: ({ context, event }) => Boolean(context.assignedPicksById[event.pickId]),
						actions: assign({
							activePickId: ({ event }) => event.pickId,
							error: null,
						}),
					},
					{
						actions: assign({ error: ({ event }) => `Pick ${event.pickId} is not assigned` }),
					},
				],
			},
		},
	},
});

export function createPickingSupervisor() {
	const actor = createActor(pickingMachine);
	actor.start();

	return {
		send(event: PickingEvent): PickingSnapshot {
			actor.send(event);
			return toSnapshot(actor);
		},
		getSnapshot(): PickingSnapshot {
			return toSnapshot(actor);
		},
		stop(): void {
			actor.stop();
		},
	};
}
