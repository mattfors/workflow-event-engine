import { createActor, createMachine, assign, type ActorRefFrom } from 'xstate';
import type { Pick } from './pick-process.machine';

interface PickingContext {
	assignedPicksById: Record<string, Pick>;
	pickOrder: string[];
	activePickId: string | null;
	error: string | null;
}

type PickingEvent =
	| {
		type: 'ASSIGN_PICKS';
		picks: Pick[];
	}
	| {
		type: 'START_PICK';
		pickId: string;
	};

export interface PickingSnapshot {
	state: string;
	assignedPicks: Pick[];
	activePickId: string | null;
	activePick: Pick | null;
	error: string | null;
}

function normalizePick(pick: Pick): Pick {
	return {
		id: pick?.id ?? '',
		location: pick?.location ?? '',
		carton: pick?.carton ?? '',
		validItemCodes: Array.isArray(pick?.validItemCodes) ? pick.validItemCodes : [],
		quantity: Number.isInteger(pick?.quantity) && pick.quantity > 0 ? pick.quantity : 0,
	};
}

function isValidPick(pick: Pick): boolean {
	return Boolean(
		pick.id
		&& pick.location
		&& pick.carton
		&& pick.validItemCodes.length > 0
		&& pick.quantity > 0,
	);
}

function mergeAssignedPicks(
	currentById: Record<string, Pick>,
	currentOrder: string[],
	incomingPicks: Pick[],
): { nextById: Record<string, Pick>; nextOrder: string[] } {
	const nextById = { ...currentById };
	const nextOrder = [...currentOrder];

	for (const pickInput of incomingPicks) {
		const pick = normalizePick(pickInput);
		if (!isValidPick(pick)) {
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
		.filter((pick): pick is Pick => Boolean(pick));

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
	context: {
		assignedPicksById: {},
		pickOrder: [],
		activePickId: null,
		error: null,
	},
	states: {
		idle: {
			on: {
				ASSIGN_PICKS: {
					target: 'ready',
					actions: assign(({ context, event }) => {
						const { nextById, nextOrder } = mergeAssignedPicks(
							context.assignedPicksById,
							context.pickOrder,
							event.picks,
						);
						return {
							assignedPicksById: nextById,
							pickOrder: nextOrder,
							error: null,
						};
					}),
				},
			},
		},
		ready: {
			on: {
				ASSIGN_PICKS: {
					actions: assign(({ context, event }) => {
						const { nextById, nextOrder } = mergeAssignedPicks(
							context.assignedPicksById,
							context.pickOrder,
							event.picks,
						);
						return {
							assignedPicksById: nextById,
							pickOrder: nextOrder,
							error: null,
						};
					}),
				},
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
				ASSIGN_PICKS: {
					actions: assign(({ context, event }) => {
						const { nextById, nextOrder } = mergeAssignedPicks(
							context.assignedPicksById,
							context.pickOrder,
							event.picks,
						);
						return {
							assignedPicksById: nextById,
							pickOrder: nextOrder,
							error: null,
						};
					}),
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
