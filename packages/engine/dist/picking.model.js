"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizePick = normalizePick;
exports.isValidPick = isValidPick;
exports.isValidPickWorkItem = isValidPickWorkItem;
exports.validatePick = validatePick;
exports.validatePickWorkItem = validatePickWorkItem;
function normalizePick(pick) {
    const quantity = pick.quantity;
    return {
        id: pick.id,
        location: pick.location,
        carton: pick.carton,
        validItemCodes: Array.isArray(pick.validItemCodes) ? pick.validItemCodes : [],
        quantity: Number.isInteger(quantity) && (quantity ?? 0) > 0 ? (quantity ?? 0) : 0,
    };
}
function isValidPick(pick) {
    return Boolean(pick.id
        && pick.location
        && pick.carton
        && pick.validItemCodes.length > 0
        && pick.quantity > 0);
}
function isValidPickWorkItem(pick) {
    return Boolean(pick.id
        && pick.location
        && pick.carton
        && pick.validItemCodes.length > 0
        && pick.quantity > 0);
}
function validatePick(pick) {
    if (!isValidPick(pick)) {
        throw new Error('Pick requires id, location, carton, validItemCodes, and quantity');
    }
}
function validatePickWorkItem(pick) {
    if (!isValidPickWorkItem(pick)) {
        throw new Error('PickWorkItem requires id, location, carton, validItemCodes, and quantity');
    }
}
