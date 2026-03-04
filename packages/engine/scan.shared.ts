export type ScanEvent = {
	type: 'SCAN';
	value: string;
};

export const SCAN_ERROR_CODES = {
	INVALID_SCAN: 'INVALID_SCAN',
} as const;

export type ScanErrorCode = typeof SCAN_ERROR_CODES[keyof typeof SCAN_ERROR_CODES];

export interface CountedScanBase {
	requiredCount: number;
	validScans: readonly string[];
}

export type ScanErrorMessages = Partial<Record<ScanErrorCode, string>>;

export function isScanValid(base: CountedScanBase, scannedValue: string): boolean {
	return base.validScans.includes(scannedValue);
}

export function nextScanCount(
	base: CountedScanBase,
	currentCount: number,
	scannedValue: string,
): number {
	return isScanValid(base, scannedValue) ? currentCount + 1 : currentCount;
}

export function scanCompletesRequiredCount(
	base: CountedScanBase,
	currentCount: number,
	scannedValue: string,
): boolean {
	return isScanValid(base, scannedValue) && currentCount + 1 >= base.requiredCount;
}

export function messageFromScanError(
	code: ScanErrorCode,
	messages: ScanErrorMessages,
	fallbackMessage: string,
): string {
	return messages[code] ?? fallbackMessage;
}
