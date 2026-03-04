import { type Pick, type PickWorkItem } from './picking.model';
type PickingEvent = {
    type: 'HYDRATE_PICKS';
    picks: Pick[];
} | {
    type: 'START_PICK';
    pickId: string;
};
export interface PickingSnapshot {
    state: string;
    assignedPicks: PickWorkItem[];
    activePickId: string | null;
    activePick: PickWorkItem | null;
    error: string | null;
}
export declare function createPickingSupervisor(): {
    send(event: PickingEvent): PickingSnapshot;
    getSnapshot(): PickingSnapshot;
    stop(): void;
};
export {};
