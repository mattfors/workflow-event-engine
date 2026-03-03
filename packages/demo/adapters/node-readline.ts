import readline from 'node:readline';
import type { DemoDriver } from '../contracts';

export function runNodeReadlineCli(driver: DemoDriver): void {
	const rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout,
		prompt: '> ',
	});

	for (const line of driver.getIntroLines()) {
		console.log(line);
	}

	rl.prompt();

	rl.on('line', (line) => {
		const result = driver.handleLine(line);
		for (const outputLine of result.lines) {
			if (outputLine.length > 0) {
				console.log(outputLine);
			}
		}

		if (result.exit) {
			rl.close();
			return;
		}

		rl.prompt();
	});

	rl.on('close', () => {
		process.exit(0);
	});
}
