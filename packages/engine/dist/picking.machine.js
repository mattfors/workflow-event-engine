"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPickingSupervisor = createPickingSupervisor;
const xstate_1 = require("xstate");
function normalizePick(pick) {
    return {
        id: pick?.id ?? '',
        location: pick?.location ?? '',
        carton: pick?.carton ?? '',
        validItemCodes: Array.isArray(pick?.validItemCodes) ? pick.validItemCodes : [],
        quantity: Number.isInteger(pick?.quantity) && pick.quantity > 0 ? pick.quantity : 0,
    };
}
function isValidPick(pick) {
    return Boolean(pick.id
        && pick.location
        && pick.carton
        && pick.validItemCodes.length > 0
        && pick.quantity > 0);
}
function mergeAssignedPicks(currentById, currentOrder, incomingPicks) {
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
function toSnapshot(actor) {
    const state = actor.getSnapshot();
    const assignedPicks = state.context.pickOrder
        .map((pickId) => state.context.assignedPicksById[pickId])
        .filter((pick) => Boolean(pick));
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
const pickingMachine = (0, xstate_1.createMachine)({
    types: {
        context: {},
        events: {},
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
                    actions: (0, xstate_1.assign)(({ context, event }) => {
                        const { nextById, nextOrder } = mergeAssignedPicks(context.assignedPicksById, context.pickOrder, event.picks);
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
                    actions: (0, xstate_1.assign)(({ context, event }) => {
                        const { nextById, nextOrder } = mergeAssignedPicks(context.assignedPicksById, context.pickOrder, event.picks);
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
                        actions: (0, xstate_1.assign)({
                            activePickId: ({ event }) => event.pickId,
                            error: null,
                        }),
                    },
                    {
                        actions: (0, xstate_1.assign)({ error: ({ event }) => `Pick ${event.pickId} is not assigned` }),
                    },
                ],
            },
        },
        active: {
            on: {
                ASSIGN_PICKS: {
                    actions: (0, xstate_1.assign)(({ context, event }) => {
                        const { nextById, nextOrder } = mergeAssignedPicks(context.assignedPicksById, context.pickOrder, event.picks);
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
                        actions: (0, xstate_1.assign)({
                            activePickId: ({ event }) => event.pickId,
                            error: null,
                        }),
                    },
                    {
                        actions: (0, xstate_1.assign)({ error: ({ event }) => `Pick ${event.pickId} is not assigned` }),
                    },
                ],
            },
        },
    },
});
function createPickingSupervisor() {
    const actor = (0, xstate_1.createActor)(pickingMachine);
    actor.start();
    return {
        send(event) {
            actor.send(event);
            return toSnapshot(actor);
        },
        getSnapshot() {
            return toSnapshot(actor);
        },
        stop() {
            actor.stop();
        },
    };
}
