export interface Pick {
	id: string;
	location: string;
	carton: string;
	validItemCodes: string[];
	quantity: number;
	departureTime?: string | null;
}

export interface PickWorkItem {
	id: string;
	location: string;
	carton: string;
	validItemCodes: string[];
	quantity: number;
}

export function normalizePick(pick: Pick): PickWorkItem {
	const quantity = pick.quantity;
	return {
		id: pick.id,
		location: pick.location,
		carton: pick.carton,
		validItemCodes: Array.isArray(pick.validItemCodes) ? pick.validItemCodes : [],
		quantity: Number.isInteger(quantity) && (quantity ?? 0) > 0 ? (quantity ?? 0) : 0,
	};
}

export function isValidPick(pick: Pick): boolean {
	return Boolean(
		pick.id
		&& pick.location
		&& pick.carton
		&& pick.validItemCodes.length > 0
		&& pick.quantity > 0,
	);
}

export function isValidPickWorkItem(pick: PickWorkItem): boolean {
	return Boolean(
		pick.id
		&& pick.location
		&& pick.carton
		&& pick.validItemCodes.length > 0
		&& pick.quantity > 0,
	);
}

export function validatePick(pick: Pick): void {
	if (!isValidPick(pick)) {
		throw new Error('Pick requires id, location, carton, validItemCodes, and quantity');
	}
}

export function validatePickWorkItem(pick: PickWorkItem): void {
	if (!isValidPickWorkItem(pick)) {
		throw new Error('PickWorkItem requires id, location, carton, validItemCodes, and quantity');
	}
}
