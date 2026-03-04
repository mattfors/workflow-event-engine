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
export declare function normalizeCycleCount(cycleCount: CycleCount): CycleCountWorkItem;
export declare function isValidCycleCount(cycleCount: CycleCount): boolean;
export declare function isValidCycleCountWorkItem(cycleCount: CycleCountWorkItem): boolean;
export declare function validateCycleCount(cycleCount: CycleCount): void;
export declare function validateCycleCountWorkItem(cycleCount: CycleCountWorkItem): void;
