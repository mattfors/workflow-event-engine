import type { EngineSnapshot } from 'engine';

export type DemoCommand =
	| { type: 'assignpick'; pickId: string }
	| { type: 'listpicks' }
	| { type: 'startpick'; pickId: string }
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

export function formatSnapshot(snapshot: EngineSnapshot): string {
	const progress = `${snapshot.itemScanCount}/${snapshot.pick.quantity}`;
	const error = snapshot.error ?? 'none';
	return `state=${snapshot.state} progress=${progress} done=${snapshot.done} error=${error}`;
}
