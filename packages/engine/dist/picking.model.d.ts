export interface Pick {
    id: string;
    location: string;
    carton: string;
    validItemCodes: string[];
    quantity: number;
    departureTime?: string | null;
}
export interface PickWorkItem {
    id: string;
    location: string;
    carton: string;
    validItemCodes: string[];
    quantity: number;
}
export declare function normalizePick(pick: Pick): PickWorkItem;
export declare function isValidPick(pick: Pick): boolean;
export declare function isValidPickWorkItem(pick: PickWorkItem): boolean;
export declare function validatePick(pick: Pick): void;
export declare function validatePickWorkItem(pick: PickWorkItem): void;
