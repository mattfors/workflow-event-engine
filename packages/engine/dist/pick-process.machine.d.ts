import { type Pick, type PickWorkItem } from './picking.model';
import { type ScanEvent } from './scan.shared';
export interface EngineSnapshot {
    state: string;
    pick: PickWorkItem;
    itemScanCount: number;
    done: boolean;
    error: string | null;
}
export declare function createPickEngine(pickInput: Pick): {
    send(event: ScanEvent): EngineSnapshot;
    getSnapshot(): EngineSnapshot;
    stop(): void;
};
