import { type ScanEvent } from './scan.shared';
import { type CycleCount, type CycleCountWorkItem } from './cycle-count.model';
export interface CycleCountSnapshot {
    state: string;
    workItem: CycleCountWorkItem;
    itemScanCount: number;
    done: boolean;
    error: string | null;
}
export declare function createCycleCountEngine(cycleCountInput: CycleCount): {
    send(event: ScanEvent): CycleCountSnapshot;
    getSnapshot(): CycleCountSnapshot;
    stop(): void;
};
