"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPickingSupervisor = createPickingSupervisor;
const xstate_1 = require("xstate");
const picking_model_1 = require("./picking.model");
function hydratePicks(incomingPicks) {
    const nextById = {};
    const nextOrder = [];
    for (const pickInput of incomingPicks) {
        const pick = (0, picking_model_1.normalizePick)(pickInput);
        if (!(0, picking_model_1.isValidPickWorkItem)(pick)) {
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
    on: {
        HYDRATE_PICKS: {
            target: '.ready',
            actions: (0, xstate_1.assign)(({ context, event }) => {
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
                HYDRATE_PICKS: {
                    guard: () => false,
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
