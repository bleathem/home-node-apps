export interface Vehicle {
    lat: number;
    lon: number;
    distanceFromHome: any;
    firstSeen: any;
    vehicleDesc: string;
    url: string;
    modelYearCode: string;
    statusCode: string;
    modelYear: number;
    specs: {
        attributes: [{
            name: string;
            value: any;
        }];
    };
    vin: string;
    dealerState: string;
    website: string;
    zip: number;
    dealerCode: string;
}
export declare function fetchVehicleMatches(): Promise<Vehicle[]>;
