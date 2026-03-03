import type { Pick } from './pick-process.machine';
type PickingEvent = {
    type: 'ASSIGN_PICKS';
    picks: Pick[];
} | {
    type: 'START_PICK';
    pickId: string;
};
export interface PickingSnapshot {
    state: string;
    assignedPicks: Pick[];
    activePickId: string | null;
    activePick: Pick | null;
    error: string | null;
}
export declare function createPickingSupervisor(): {
    send(event: PickingEvent): PickingSnapshot;
    getSnapshot(): PickingSnapshot;
    stop(): void;
};
export {};
