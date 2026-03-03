"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPickEngine = createPickEngine;
const xstate_1 = require("xstate");
function normalizePick(pickInput) {
    return {
        id: pickInput?.id ?? '',
        location: pickInput?.location ?? '',
        carton: pickInput?.carton ?? '',
        validItemCodes: Array.isArray(pickInput?.validItemCodes) ? pickInput.validItemCodes : [],
        quantity: Number.isInteger(pickInput?.quantity) && pickInput.quantity > 0 ? pickInput.quantity : 0,
    };
}
function validatePick(pick) {
    if (!pick.id || !pick.location || !pick.carton || pick.validItemCodes.length === 0 || pick.quantity < 1) {
        throw new Error('createPickEngine requires pick with id, location, carton, validItemCodes, and quantity');
    }
}
function toSnapshot(actor) {
    const state = actor.getSnapshot();
    return {
        state: String(state.value),
        pick: state.context.pick,
        itemScanCount: state.context.itemScanCount,
        done: state.matches('done'),
        error: state.context.error,
    };
}
const machineTemplate = (0, xstate_1.createMachine)({
    types: {
        context: {},
        events: {},
        input: {},
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
                        actions: (0, xstate_1.assign)({ error: null }),
                    },
                    {
                        actions: (0, xstate_1.assign)({ error: () => 'Scanned location does not match pick location' }),
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
                        actions: (0, xstate_1.assign)({ error: null }),
                    },
                    {
                        actions: (0, xstate_1.assign)({ error: () => 'Scanned carton does not match pick carton' }),
                    },
                ],
            },
        },
        scanItem: {
            on: {
                SCAN: [
                    {
                        guard: ({ context, event }) => (context.pick.validItemCodes.includes(event.value)
                            && context.itemScanCount + 1 >= context.pick.quantity),
                        target: 'scanCartonRescan',
                        actions: (0, xstate_1.assign)({
                            itemScanCount: ({ context }) => context.itemScanCount + 1,
                            error: null,
                        }),
                    },
                    {
                        guard: ({ context, event }) => context.pick.validItemCodes.includes(event.value),
                        actions: (0, xstate_1.assign)({
                            itemScanCount: ({ context }) => context.itemScanCount + 1,
                            error: null,
                        }),
                    },
                    {
                        actions: (0, xstate_1.assign)({ error: () => 'Scanned item code is not valid for this pick' }),
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
                        actions: (0, xstate_1.assign)({ error: null }),
                    },
                    {
                        actions: (0, xstate_1.assign)({ error: () => 'Rescanned carton does not match pick carton' }),
                    },
                ],
            },
        },
        done: {
            type: 'final',
        },
    },
});
function createPickEngine(pickInput) {
    const pick = normalizePick(pickInput);
    validatePick(pick);
    const actor = (0, xstate_1.createActor)(machineTemplate, { input: pick });
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
