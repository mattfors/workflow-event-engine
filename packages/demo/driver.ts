import { Command } from 'commander';
import { createPickEngine } from 'engine';
import * as engineModule from 'engine';
import type { CommandResult, DemoCommand, DemoDriver } from './contracts';
import { formatSnapshot } from './contracts';

interface DemoPickFixture {
	id: string;
	location: string;
	carton: string;
	validItemCodes: string[];
	quantity: number;
}

const pickFixtures: Record<string, DemoPickFixture> = {
	'123': {
		id: '123',
		location: 'abc',
		carton: '123',
		validItemCodes: ['ttyu', 'TTYU'],
		quantity: 2,
	},
};

type ActiveEngine = ReturnType<typeof createPickEngine>;
const createPickingSupervisor = (engineModule as any).createPickingSupervisor as () => {
	send: (event: unknown) => {
		state: string;
		assignedPicks: DemoPickFixture[];
		activePickId: string | null;
		activePick: DemoPickFixture | null;
		error: string | null;
	};
	getSnapshot: () => {
		state: string;
		assignedPicks: DemoPickFixture[];
		activePickId: string | null;
		activePick: DemoPickFixture | null;
		error: string | null;
	};
	stop: () => void;
};

function parseCommand(input: string): { command?: DemoCommand; error?: string } {
	const argv = input.trim().split(/\s+/).filter(Boolean);
	if (argv.length === 0) {
		return { error: '' };
	}

	let parsed: DemoCommand | undefined;
	const program = new Command();
	program
		.name('demo')
		.exitOverride()
		.allowUnknownOption(false)
		.allowExcessArguments(false)
		.configureOutput({
			writeOut: () => {},
			writeErr: () => {},
		});

	program.command('startpick <pickId>').action((pickId) => {
		parsed = { type: 'startpick', pickId: String(pickId) };
	});

	program.command('assignpick <pickId>').action((pickId) => {
		parsed = { type: 'assignpick', pickId: String(pickId) };
	});

	program.command('listpicks').action(() => {
		parsed = { type: 'listpicks' };
	});

	program.command('scan <value>').action((value) => {
		parsed = { type: 'scan', value: String(value) };
	});

	program.command('status').action(() => {
		parsed = { type: 'status' };
	});

	program.command('pick').action(() => {
		parsed = { type: 'pick' };
	});

	program.command('help').action(() => {
		parsed = { type: 'help' };
	});

	program.command('exit').action(() => {
		parsed = { type: 'exit' };
	});

	program.command('quit').action(() => {
		parsed = { type: 'exit' };
	});

	try {
		program.parse(argv, { from: 'user' });
	} catch {
		return { error: 'Invalid command. Type help for available commands.' };
	}

	if (!parsed) {
		return { error: 'Invalid command. Type help for available commands.' };
	}

	return { command: parsed };
}

function helpLines(): string[] {
	return [
		'Commands:',
		'  assignpick <id>',
		'  listpicks',
		'  startpick <id>',
		'  scan <value>',
		'  status',
		'  pick',
		'  help',
		'  exit',
		'',
		'Example:',
		'  assignpick 123',
		'  listpicks',
		'  startpick 123',
		'  scan abc',
		'  scan 123',
		'  scan ttyu',
		'  scan ttyu',
		'  scan 123',
	];
}

function pickDetailsLines(engine: ActiveEngine): string[] {
	const snapshot = engine.getSnapshot();
	const pickJsonLines = JSON.stringify(snapshot.pick, null, 2).split('\n');
	return [
		'Current pick:',
		...pickJsonLines,
		`  itemScanCount: ${snapshot.itemScanCount}`,
		`  state: ${snapshot.state}`,
		`  done: ${snapshot.done}`,
		`  error: ${snapshot.error ?? 'none'}`,
	];
}

export function createDemoDriver(): DemoDriver {
	let activeEngine: ActiveEngine | null = null;
	const picking = createPickingSupervisor();

	return {
		getIntroLines(): string[] {
			return ['Pick demo CLI', ...helpLines()];
		},
		handleLine(input: string): CommandResult {
			const parsed = parseCommand(input);
			if (parsed.error) {
				return parsed.error ? { lines: [parsed.error] } : { lines: [] };
			}

			if (!parsed.command) {
				return { lines: [] };
			}

			switch (parsed.command.type) {
				case 'assignpick': {
					const pick = pickFixtures[parsed.command.pickId];
					if (!pick) {
						return { lines: [`Pick ${parsed.command.pickId} not found.`] };
					}

					const snapshot = picking.send({ type: 'ASSIGN_PICKS', picks: [pick] });
					return {
						lines: [
							`Assigned pick ${pick.id}.`,
							`Supervisor state=${snapshot.state} assigned=${snapshot.assignedPicks.length} active=${snapshot.activePickId ?? 'none'}`,
						],
					};
				}
				case 'listpicks': {
					const snapshot = picking.getSnapshot();
					if (snapshot.assignedPicks.length === 0) {
						return { lines: ['No assigned picks. Run assignpick <id> first.'] };
					}

					return {
						lines: [
							`Assigned picks (${snapshot.assignedPicks.length}):`,
							...snapshot.assignedPicks.map((pick) => `  - ${pick.id}`),
							`Active pick: ${snapshot.activePickId ?? 'none'}`,
						],
					};
				}
				case 'startpick': {
					const pickingSnapshot = picking.send({ type: 'START_PICK', pickId: parsed.command.pickId });
					if (pickingSnapshot.error) {
						return { lines: [pickingSnapshot.error] };
					}

					if (!pickingSnapshot.activePick) {
						return { lines: ['Unable to start pick.'] };
					}

					if (activeEngine) {
						activeEngine.stop();
					}

					activeEngine = createPickEngine(pickingSnapshot.activePick as any);
					return {
						lines: [
							`Started pick ${pickingSnapshot.activePick.id}.`,
							`Supervisor state=${pickingSnapshot.state} active=${pickingSnapshot.activePickId ?? 'none'}`,
							formatSnapshot(activeEngine.getSnapshot()),
						],
					};
				}
				case 'scan': {
					if (!activeEngine) {
						return { lines: ['No active pick. Run startpick <id> first.'] };
					}

					const snapshot = activeEngine.send({ type: 'SCAN', value: parsed.command.value });
					const lines = [`Scanned: ${parsed.command.value}`, formatSnapshot(snapshot)];
					if (snapshot.done) {
						lines.push(`Pick ${snapshot.pick.id} complete.`);
					}
					return { lines };
				}
				case 'status': {
					if (!activeEngine) {
						return { lines: ['No active pick.'] };
					}
					return { lines: [formatSnapshot(activeEngine.getSnapshot())] };
				}
				case 'pick': {
					if (!activeEngine) {
						return { lines: ['No active pick.'] };
					}
					return { lines: pickDetailsLines(activeEngine) };
				}
				case 'help': {
					return { lines: helpLines() };
				}
				case 'exit': {
					if (activeEngine) {
						activeEngine.stop();
						activeEngine = null;
					}
					picking.stop();
					return { lines: ['Bye.'], exit: true };
				}
				default:
					return { lines: ['Invalid command. Type help for available commands.'] };
			}
		},
	};
}
