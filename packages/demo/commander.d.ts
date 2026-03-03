declare module 'commander' {
	export class Command {
		name(name: string): this;
		exitOverride(): this;
		allowUnknownOption(allowUnknown?: boolean): this;
		allowExcessArguments(allowExcess?: boolean): this;
		configureOutput(output: { writeOut?: (str: string) => void; writeErr?: (str: string) => void }): this;
		command(nameAndArgs: string): this;
		action(fn: (...args: any[]) => void): this;
		parse(argv?: readonly string[], options?: { from?: 'node' | 'user' }): this;
	}
}
