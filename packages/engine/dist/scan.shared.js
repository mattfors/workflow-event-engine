"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SCAN_ERROR_CODES = void 0;
exports.isScanValid = isScanValid;
exports.nextScanCount = nextScanCount;
exports.scanCompletesRequiredCount = scanCompletesRequiredCount;
exports.messageFromScanError = messageFromScanError;
exports.SCAN_ERROR_CODES = {
    INVALID_SCAN: 'INVALID_SCAN',
};
function isScanValid(base, scannedValue) {
    return base.validScans.includes(scannedValue);
}
function nextScanCount(base, currentCount, scannedValue) {
    return isScanValid(base, scannedValue) ? currentCount + 1 : currentCount;
}
function scanCompletesRequiredCount(base, currentCount, scannedValue) {
    return isScanValid(base, scannedValue) && currentCount + 1 >= base.requiredCount;
}
function messageFromScanError(code, messages, fallbackMessage) {
    return messages[code] ?? fallbackMessage;
}
