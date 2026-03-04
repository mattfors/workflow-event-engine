"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCycleCountEngine = createCycleCountEngine;
const xstate_1 = require("xstate");
const scan_shared_1 = require("./scan.shared");
const cycle_count_model_1 = require("./cycle-count.model");
const cycleCountScanErrorMessages = {
    [scan_shared_1.SCAN_ERROR_CODES.INVALID_SCAN]: 'Scanned value is not valid for this cycle count',
};
function getCountedScanBase(workItem) {
    return {
        requiredCount: workItem.count,
        validScans: workItem.validScans,
    };
}
function toSnapshot(actor) {
    const state = actor.getSnapshot();
    return {
        state: String(state.value),
        workItem: state.context.workItem,
        itemScanCount: state.context.itemScanCount,
        done: state.matches('done'),
        error: state.context.error,
    };
}
const cycleCountMachine = (0, xstate_1.createMachine)({
    types: {
        context: {},
        events: {},
        input: {},
    },
    id: 'cycleCountEngine',
    initial: 'scanItem',
    context: ({ input }) => ({
        workItem: input,
        itemScanCount: 0,
        error: null,
    }),
    states: {
        scanItem: {
            on: {
                SCAN: [
                    {
                        guard: ({ context, event }) => (0, scan_shared_1.scanCompletesRequiredCount)(getCountedScanBase(context.workItem), context.itemScanCount, event.value),
                        target: 'done',
                        actions: (0, xstate_1.assign)({
                            itemScanCount: ({ context, event }) => (0, scan_shared_1.nextScanCount)(getCountedScanBase(context.workItem), context.itemScanCount, event.value),
                            error: null,
                        }),
                    },
                    {
                        guard: ({ context, event }) => (0, scan_shared_1.isScanValid)(getCountedScanBase(context.workItem), event.value),
                        actions: (0, xstate_1.assign)({
                            itemScanCount: ({ context, event }) => (0, scan_shared_1.nextScanCount)(getCountedScanBase(context.workItem), context.itemScanCount, event.value),
                            error: null,
                        }),
                    },
                    {
                        actions: (0, xstate_1.assign)({
                            error: () => (0, scan_shared_1.messageFromScanError)(scan_shared_1.SCAN_ERROR_CODES.INVALID_SCAN, cycleCountScanErrorMessages, 'Scanned value is not valid'),
                        }),
                    },
                ],
            },
        },
        done: {
            type: 'final',
        },
    },
});
function createCycleCountEngine(cycleCountInput) {
    const cycleCount = (0, cycle_count_model_1.normalizeCycleCount)(cycleCountInput);
    (0, cycle_count_model_1.validateCycleCountWorkItem)(cycleCount);
    const actor = (0, xstate_1.createActor)(cycleCountMachine, { input: cycleCount });
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
