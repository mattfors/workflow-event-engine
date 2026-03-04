"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeCycleCount = normalizeCycleCount;
exports.isValidCycleCount = isValidCycleCount;
exports.isValidCycleCountWorkItem = isValidCycleCountWorkItem;
exports.validateCycleCount = validateCycleCount;
exports.validateCycleCountWorkItem = validateCycleCountWorkItem;
function normalizeCycleCount(cycleCount) {
    const count = cycleCount.count;
    return {
        id: cycleCount.id,
        validScans: Array.isArray(cycleCount.validScans) ? cycleCount.validScans : [],
        count: Number.isInteger(count) && (count ?? 0) > 0 ? (count ?? 0) : 0,
    };
}
function isValidCycleCount(cycleCount) {
    return Boolean(cycleCount.id
        && cycleCount.validScans.length > 0
        && cycleCount.count > 0);
}
function isValidCycleCountWorkItem(cycleCount) {
    return Boolean(cycleCount.id
        && cycleCount.validScans.length > 0
        && cycleCount.count > 0);
}
function validateCycleCount(cycleCount) {
    if (!isValidCycleCount(cycleCount)) {
        throw new Error('CycleCount requires id, validScans, and count');
    }
}
function validateCycleCountWorkItem(cycleCount) {
    if (!isValidCycleCountWorkItem(cycleCount)) {
        throw new Error('CycleCountWorkItem requires id, validScans, and count');
    }
}
