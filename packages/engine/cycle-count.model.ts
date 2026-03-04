export interface CycleCount {
	id: string;
	validScans: string[];
	count: number;
}

export interface CycleCountWorkItem {
	id: string;
	validScans: string[];
	count: number;
}

export function normalizeCycleCount(cycleCount: CycleCount): CycleCountWorkItem {
	const count = cycleCount.count;
	return {
		id: cycleCount.id,
		validScans: Array.isArray(cycleCount.validScans) ? cycleCount.validScans : [],
		count: Number.isInteger(count) && (count ?? 0) > 0 ? (count ?? 0) : 0,
	};
}

export function isValidCycleCount(cycleCount: CycleCount): boolean {
	return Boolean(
		cycleCount.id
		&& cycleCount.validScans.length > 0
		&& cycleCount.count > 0,
	);
}

export function isValidCycleCountWorkItem(cycleCount: CycleCountWorkItem): boolean {
	return Boolean(
		cycleCount.id
		&& cycleCount.validScans.length > 0
		&& cycleCount.count > 0,
	);
}

export function validateCycleCount(cycleCount: CycleCount): void {
	if (!isValidCycleCount(cycleCount)) {
		throw new Error('CycleCount requires id, validScans, and count');
	}
}

export function validateCycleCountWorkItem(cycleCount: CycleCountWorkItem): void {
	if (!isValidCycleCountWorkItem(cycleCount)) {
		throw new Error('CycleCountWorkItem requires id, validScans, and count');
	}
}
