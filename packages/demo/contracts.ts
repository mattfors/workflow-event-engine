import type { CycleCountSnapshot, EngineSnapshot } from 'engine';

export type DemoCommand =
	| { type: 'hydratepicks' }
	| { type: 'listpicks' }
	| { type: 'startpick'; pickId: string }
	| { type: 'startcount'; countId: string }
	| { type: 'scan'; value: string }
	| { type: 'status' }
	| { type: 'pick' }
	| { type: 'help' }
	| { type: 'exit' };

export interface CommandResult {
	lines: string[];
	exit?: boolean;
}

export interface DemoDriver {
	getIntroLines(): string[];
	handleLine(input: string): CommandResult;
}

export function formatSnapshot(snapshot: EngineSnapshot | CycleCountSnapshot): string {
	const totalCount = 'pick' in snapshot
		? snapshot.pick.quantity
		: snapshot.workItem.count;
	const progress = `${snapshot.itemScanCount}/${totalCount}`;
	const error = snapshot.error ?? 'none';
	return `state=${snapshot.state} progress=${progress} done=${snapshot.done} error=${error}`;
}
