"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPickEngine = createPickEngine;
const xstate_1 = require("xstate");
const picking_model_1 = require("./picking.model");
const scan_shared_1 = require("./scan.shared");
const pickScanErrorMessages = {
    [scan_shared_1.SCAN_ERROR_CODES.INVALID_SCAN]: 'Scanned item code is not valid for this pick',
};
function getCountedScanBase(pick) {
    return {
        requiredCount: pick.quantity,
        validScans: pick.validItemCodes,
    };
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
                        guard: ({ context, event }) => (0, scan_shared_1.scanCompletesRequiredCount)(getCountedScanBase(context.pick), context.itemScanCount, event.value),
                        target: 'scanCartonRescan',
                        actions: (0, xstate_1.assign)({
                            itemScanCount: ({ context, event }) => (0, scan_shared_1.nextScanCount)(getCountedScanBase(context.pick), context.itemScanCount, event.value),
                            error: null,
                        }),
                    },
                    {
                        guard: ({ context, event }) => (0, scan_shared_1.isScanValid)(getCountedScanBase(context.pick), event.value),
                        actions: (0, xstate_1.assign)({
                            itemScanCount: ({ context, event }) => (0, scan_shared_1.nextScanCount)(getCountedScanBase(context.pick), context.itemScanCount, event.value),
                            error: null,
                        }),
                    },
                    {
                        actions: (0, xstate_1.assign)({
                            error: () => (0, scan_shared_1.messageFromScanError)(scan_shared_1.SCAN_ERROR_CODES.INVALID_SCAN, pickScanErrorMessages, 'Scanned item code is not valid for this pick'),
                        }),
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
    const pick = (0, picking_model_1.normalizePick)(pickInput);
    (0, picking_model_1.validatePickWorkItem)(pick);
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
