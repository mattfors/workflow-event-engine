import { createActor, createMachine, assign, type ActorRefFrom } from 'xstate';
import {
	SCAN_ERROR_CODES,
	type CountedScanBase,
	type ScanErrorCode,
	type ScanErrorMessages,
	type ScanEvent,
	messageFromScanError,
	nextScanCount,
	scanCompletesRequiredCount,
	isScanValid,
} from './scan.shared';
import type { PickWorkItem } from './picking.model';
import type { CycleCountWorkItem } from './cycle-count.model';

interface ScanItemContext {
	base: CountedScanBase;
	itemScanCount: number;
	error: string | null;
	errorCode: ScanErrorCode | null;
	errorMessages: ScanErrorMessages;
	fallbackInvalidScanMessage: string;
}

interface ScanItemInput {
	base: CountedScanBase;
	errorMessages: ScanErrorMessages;
	fallbackInvalidScanMessage: string;
}

export interface ScanItemSnapshot {
	state: string;
	itemScanCount: number;
	done: boolean;
	error: string | null;
	errorCode: ScanErrorCode | null;
}

function toSnapshot(actor: ActorRefFrom<typeof scanItemMachine>): ScanItemSnapshot {
	const state = actor.getSnapshot();
	return {
		state: String(state.value),
		itemScanCount: state.context.itemScanCount,
		done: state.matches('done'),
		error: state.context.error,
		errorCode: state.context.errorCode,
	};
}

const scanItemMachine = createMachine({
	types: {
		context: {} as ScanItemContext,
		events: {} as ScanEvent,
		input: {} as ScanItemInput,
	},
	id: 'scanItemSubEngine',
	initial: 'scanItem',
	context: ({ input }) => ({
		base: input.base,
		itemScanCount: 0,
		error: null,
		errorCode: null,
		errorMessages: input.errorMessages,
		fallbackInvalidScanMessage: input.fallbackInvalidScanMessage,
	}),
	states: {
		scanItem: {
			on: {
				SCAN: [
					{
						guard: ({ context, event }) => scanCompletesRequiredCount(
							context.base,
							context.itemScanCount,
							event.value,
						),
						target: 'done',
						actions: assign({
							itemScanCount: ({ context, event }) => nextScanCount(
								context.base,
								context.itemScanCount,
								event.value,
							),
							error: null,
							errorCode: null,
						}),
					},
					{
						guard: ({ context, event }) => isScanValid(context.base, event.value),
						actions: assign({
							itemScanCount: ({ context, event }) => nextScanCount(
								context.base,
								context.itemScanCount,
								event.value,
							),
							error: null,
							errorCode: null,
						}),
					},
					{
						actions: assign({
							error: ({ context }) => messageFromScanError(
								SCAN_ERROR_CODES.INVALID_SCAN,
								context.errorMessages,
								context.fallbackInvalidScanMessage,
							),
							errorCode: () => SCAN_ERROR_CODES.INVALID_SCAN,
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

export function createScanItemEngine(input: ScanItemInput) {
	const actor = createActor(scanItemMachine, { input });
	actor.start();

	return {
		send(event: ScanEvent): ScanItemSnapshot {
			actor.send(event);
			return toSnapshot(actor);
		},
		getSnapshot(): ScanItemSnapshot {
			return toSnapshot(actor);
		},
		stop(): void {
			actor.stop();
		},
	};
}

export type ScanItemEngine = ReturnType<typeof createScanItemEngine>;

export interface DelegatedScanItemContext {
	scanItemEngine: ScanItemEngine;
	itemScanCount: number;
	scanItemDone: boolean;
	error: string | null;
}

export function createDelegatedScanItemState(doneTarget: string): any {
	const stateConfig = {
		on: {
			SCAN: {
				actions: assign(({ context, event }: {
					context: DelegatedScanItemContext;
					event: ScanEvent;
				}) => {
					const snapshot = context.scanItemEngine.send(event);
					return {
						itemScanCount: snapshot.itemScanCount,
						scanItemDone: snapshot.done,
						error: snapshot.error,
					};
				}),
			},
		},
		always: [
			{
				guard: ({ context }: { context: DelegatedScanItemContext }) => context.scanItemDone,
				target: doneTarget,
			},
		],
	};

	return stateConfig;
}

export function createPickScanItemEngine(workItem: PickWorkItem) {
	return createScanItemEngine({
		base: {
			requiredCount: workItem.quantity,
			validScans: workItem.validItemCodes,
		},
		errorMessages: {
			[SCAN_ERROR_CODES.INVALID_SCAN]: 'Scanned item code is not valid for this pick',
		},
		fallbackInvalidScanMessage: 'Scanned item code is not valid for this pick',
	});
}

export function createCycleCountScanItemEngine(workItem: CycleCountWorkItem) {
	return createScanItemEngine({
		base: {
			requiredCount: workItem.count,
			validScans: workItem.validScans,
		},
		errorMessages: {
			[SCAN_ERROR_CODES.INVALID_SCAN]: 'Scanned value is not valid for this cycle count',
		},
		fallbackInvalidScanMessage: 'Scanned value is not valid',
	});
}
