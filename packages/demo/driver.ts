import { Command } from 'commander';
import { createCycleCountEngine, createPickEngine } from 'engine';
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

interface DemoCycleCountFixture {
	id: string;
	validScans: string[];
	count: number;
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

const cycleCountFixtures: Record<string, DemoCycleCountFixture> = {
	'cc-1': {
		id: 'cc-1',
		validScans: ['sku-1', 'SKU-1'],
		count: 3,
	},
};

type ActivePickEngine = ReturnType<typeof createPickEngine>;
type ActiveCycleCountEngine = ReturnType<typeof createCycleCountEngine>;
type ActiveEngine = ActivePickEngine | ActiveCycleCountEngine;
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

	program.command('startcount <countId>').action((countId) => {
		parsed = { type: 'startcount', countId: String(countId) };
	});

	program.command('hydratepicks').action(() => {
		parsed = { type: 'hydratepicks' };
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
		'  hydratepicks',
		'  listpicks',
		'  startpick <id>',
		'  startcount <id>',
		'  scan <value>',
		'  status',
		'  pick',
		'  help',
		'  exit',
		'',
		'Example:',
		'  hydratepicks',
		'  listpicks',
		'  startpick 123',
		'  startcount cc-1',
		'  scan abc',
		'  scan 123',
		'  scan ttyu',
		'  scan ttyu',
		'  scan 123',
	];
}

function activeDetailsLines(engine: ActiveEngine): string[] {
	const snapshot = engine.getSnapshot();
	if ('pick' in snapshot) {
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

	const countJsonLines = JSON.stringify(snapshot.workItem, null, 2).split('\n');
	return [
		'Current cycle count item:',
		...countJsonLines,
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
				case 'hydratepicks': {
					const picks = Object.values(pickFixtures);
					const snapshot = picking.send({ type: 'HYDRATE_PICKS', picks });
					return {
						lines: [
							`Hydrated ${snapshot.assignedPicks.length} picks.`,
							`Supervisor state=${snapshot.state} picks=${snapshot.assignedPicks.length} active=${snapshot.activePickId ?? 'none'}`,
						],
					};
				}
				case 'listpicks': {
					const snapshot = picking.getSnapshot();
					if (snapshot.assignedPicks.length === 0) {
						return { lines: ['No hydrated picks. Run hydratepicks first.'] };
					}

					return {
						lines: [
							`Hydrated picks (${snapshot.assignedPicks.length}):`,
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
				case 'startcount': {
					const cycleCount = cycleCountFixtures[parsed.command.countId];
					if (!cycleCount) {
						return {
							lines: [
								`Cycle count ${parsed.command.countId} not found. Available ids: ${Object.keys(cycleCountFixtures).join(', ')}`,
							],
						};
					}

					if (activeEngine) {
						activeEngine.stop();
					}

					activeEngine = createCycleCountEngine(cycleCount);
					return {
						lines: [
							`Started cycle count ${cycleCount.id}.`,
							formatSnapshot(activeEngine.getSnapshot()),
						],
					};
				}
				case 'scan': {
					if (!activeEngine) {
						return { lines: ['No active workflow. Run startpick <id> or startcount <id> first.'] };
					}

					const snapshot = activeEngine.send({ type: 'SCAN', value: parsed.command.value });
					const lines = [`Scanned: ${parsed.command.value}`, formatSnapshot(snapshot)];
					if (snapshot.done) {
						if ('pick' in snapshot) {
							lines.push(`Pick ${snapshot.pick.id} complete.`);
						} else {
							lines.push(`Cycle count ${snapshot.workItem.id} complete.`);
						}
					}
					return { lines };
				}
				case 'status': {
					if (!activeEngine) {
						return { lines: ['No active workflow.'] };
					}
					return { lines: [formatSnapshot(activeEngine.getSnapshot())] };
				}
				case 'pick': {
					if (!activeEngine) {
						return { lines: ['No active workflow.'] };
					}
					return { lines: activeDetailsLines(activeEngine) };
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
