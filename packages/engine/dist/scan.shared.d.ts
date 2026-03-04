export type ScanEvent = {
    type: 'SCAN';
    value: string;
};
export declare const SCAN_ERROR_CODES: {
    readonly INVALID_SCAN: "INVALID_SCAN";
};
export type ScanErrorCode = typeof SCAN_ERROR_CODES[keyof typeof SCAN_ERROR_CODES];
export interface CountedScanBase {
    requiredCount: number;
    validScans: readonly string[];
}
export type ScanErrorMessages = Partial<Record<ScanErrorCode, string>>;
export declare function isScanValid(base: CountedScanBase, scannedValue: string): boolean;
export declare function nextScanCount(base: CountedScanBase, currentCount: number, scannedValue: string): number;
export declare function scanCompletesRequiredCount(base: CountedScanBase, currentCount: number, scannedValue: string): boolean;
export declare function messageFromScanError(code: ScanErrorCode, messages: ScanErrorMessages, fallbackMessage: string): string;
