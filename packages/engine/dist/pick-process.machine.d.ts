export interface Pick {
    id: string;
    location: string;
    carton: string;
    validItemCodes: string[];
    quantity: number;
}
export type PickInput = Pick;
type ScanEvent = {
    type: 'SCAN';
    value: string;
};
export interface EngineSnapshot {
    state: string;
    pick: Pick;
    itemScanCount: number;
    done: boolean;
    error: string | null;
}
export declare function createPickEngine(pickInput: PickInput): {
    send(event: ScanEvent): EngineSnapshot;
    getSnapshot(): EngineSnapshot;
    stop(): void;
};
export {};
