"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const distance_1 = require("./distance");
let localStorage;
let fetch;
const zips = [
    96001,
    95928,
    95482,
    95548,
    96024,
    95540,
    96161,
    96130,
    95901,
    95815,
    94954,
    95315,
    93514,
    93954,
    93726,
    93305,
    93534,
    92101,
    92311,
    93549,
    93401,
    93101,
    92280,
    92234
];
const options = {
    attributes: 'cab:Mega Cab',
    func: 'SALES',
    includeIncentives: 'N',
    matchType: 'X',
    optionCodes: 'ESA',
    pageNumber: '1',
    pageSize: '1000',
    radius: '150',
    variation: 'BIG HORN,LARAMIE',
    sortBy: '0',
    modelYearCode: ''
};
function init() {
    return __awaiter(this, void 0, void 0, function* () {
        if (typeof window !== 'undefined' && window.localStorage) {
            localStorage = window.localStorage;
        }
        else {
            const { LocalStorage } = yield Promise.resolve().then(() => __importStar(require('node-localstorage')));
            localStorage = new LocalStorage('./data');
        }
        if (typeof window !== 'undefined' && window.fetch) {
            fetch = window.fetch;
        }
        else {
            fetch = (yield Promise.resolve().then(() => __importStar(require('node-fetch'))));
        }
    });
}
function fetchVehicles(zip, year) {
    return __awaiter(this, void 0, void 0, function* () {
        const yearOptions = Object.assign({}, options, {
            zip: zip,
            modelYearCode: `IUT${year}14`
        });
        const qs = Object.entries(yearOptions)
            .map(([key, val]) => {
            return `${key}=${val}`;
        })
            .join('&');
        const json = yield fetch(`https://www.ramtrucks.com/hostd/inventory/getinventoryresults.json?${qs}`).then(res => res.json());
        return json.result.data.vehicles.map((v) => {
            v.zip = zip;
            v.modelYearCode = yearOptions.modelYearCode;
            v.url = getUrl(v);
            return v;
        });
    });
}
function fetchDealers(zip) {
    return __awaiter(this, void 0, void 0, function* () {
        const json = yield fetch(`https://www.ramtrucks.com/bdlws/MDLSDealerLocator?zipCode=${zip}&func=SALES&radius=150&brandCode=R&resultsPerPage=999`).then(res => res.json());
        return json.dealer.reduce((acc, d) => {
            acc[d.dealerCode] = d;
            return acc;
        }, {});
    });
}
function fetchByZip(zip) {
    return __awaiter(this, void 0, void 0, function* () {
        const years = [2018, 2019];
        return Promise.all([
            fetchDealers(zip),
            ...years.map(year => fetchVehicles(zip, year))
        ]);
    });
}
function setWebsite(vehicle, dealers) {
    const dealer = dealers[vehicle.dealerCode];
    if (dealer) {
        vehicle.website = `${dealer.website}/catcher.esl?vin=${vehicle.vin}`;
        vehicle.dealerState = dealer.dealerState;
    }
    else {
        vehicle.website = 'not-found';
    }
    return vehicle;
}
const asyncLimit = function (fn, n) {
    let pendingPromises = [];
    return function (...args) {
        return __awaiter(this, void 0, void 0, function* () {
            while (pendingPromises.length >= n) {
                yield Promise.race(pendingPromises).catch(() => { });
            }
            const p = fn.apply(this, args);
            pendingPromises.push(p);
            yield p.catch(() => { });
            pendingPromises = pendingPromises.filter(pending => pending !== p);
            return p;
        });
    };
};
function getAllVehicles() {
    return __awaiter(this, void 0, void 0, function* () {
        const limitedFetchByZip = asyncLimit(fetchByZip, 20);
        const requests = zips.map(limitedFetchByZip);
        const vehicles = yield Promise.all(requests.map(byZip => byZip.then(args => {
            const dealers = args[0];
            const vehiclesByYear = args.slice(1);
            const vehicles = vehiclesByYear.map((vehicles) => vehicles.map(v => setWebsite(v, dealers)));
            return [].concat(...vehicles).filter((vehicle) => {
                return vehicle.dealerState === 'CA';
            });
        }))).then(all => all.reduce((acc, list) => [...acc, ...list], []));
        const uniques = Object.values(vehicles.reduce((acc, v) => {
            acc[v.vin] = v;
            return acc;
        }, {}));
        return uniques;
    });
}
function findMatches(vehicles) {
    const sixSeaters = vehicles.filter(v => {
        const capacity = v.specs.attributes.filter((attr) => attr.name === 'Seats')[0];
        return capacity.value === 6;
    });
    return sixSeaters;
}
function setDistanceFromHome(v) {
    const numberFormatter = new Intl.NumberFormat('en-US', {
        maximumFractionDigits: 0
    });
    v.distanceFromHome = numberFormatter.format(distance_1.distanceFromHome(v.lat, v.lon));
}
function updateHistory(vehicles) {
    const history = JSON.parse(localStorage.getItem('vehicles') || '{}');
    const map = {};
    vehicles.forEach(v => {
        const h = history[v.vin];
        v.firstSeen = h ? new Date(h.firstSeen) : new Date();
        v.lastSeen = new Date();
        map[v.vin] = v;
    });
    Object.keys(history).forEach(vin => {
        if (!map[vin]) {
            const v = history[vin];
            v.firstSeen = new Date(v.firstSeen);
            v.lastSeen = new Date(v.lastSeen);
            map[v.vin] = v;
        }
    });
    return Object.values(map);
}
function fetchVehicleMatches() {
    return __awaiter(this, void 0, void 0, function* () {
        yield init();
        const vehicles = yield getAllVehicles();
        const sixSeaters = findMatches(vehicles);
        sixSeaters.forEach(setDistanceFromHome);
        sixSeaters.sort(compare);
        const allVehicles = updateHistory(sixSeaters);
        return allVehicles;
    });
}
exports.fetchVehicleMatches = fetchVehicleMatches;
function compare(a, b) {
    const ret = a.modelYear - b.modelYear;
    if (ret !== 0) {
        return ret;
    }
    return b.distanceFromHome - a.distanceFromHome;
}
function getUrl({ modelYearCode, vin, dealerCode, statusCode }) {
    return `https://www.ramtrucks.com/new-inventory/vehicle-details.html?modelYearCode=${modelYearCode}&vin=${vin}&dealerCode=${dealerCode}&radius=100&matchType=X&statusCode=${statusCode}`;
}
//# sourceMappingURL=fetch.js.map