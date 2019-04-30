"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const chalk_1 = __importDefault(require("chalk"));
const moment_1 = __importDefault(require("moment"));
const fetch_1 = require("./fetch");
function printVehicle(v, index) {
    const vehicleDesc = v.vehicleDesc
        .replace('LARAMIE', chalk_1.default.rgb(212, 154, 106)('LARAMIE'))
        .replace('BIG HORN', chalk_1.default.rgb(170, 108, 57)('BIG HORN'));
    const isNew = (Date.now() - v.firstSeen.getTime()) / 60000 < 60;
    const isGone = Date.now() - v.lastSeen.getTime() > 3600;
    const distancePercent = 100 - Math.min(v.distanceFromHome / 5, 100);
    const agePercent = 100 - Math.min(moment_1.default(Date.now()).diff(moment_1.default(v.firstSeen), 'hours'), 100);
    console.log(`${index}) `, isNew ? chalk_1.default.white.bgGreen('** New **') : '', isGone ? chalk_1.default.white.bgRed('** Gone **') : '', v.modelYear
        .toString()
        .replace('2018', chalk_1.default.rgb(64, 127, 127)('2018'))
        .replace('2019', chalk_1.default.rgb(34, 102, 102)('2019')), vehicleDesc, `(${v.zip}, ${v.dealerState}, `, chalk_1.default.hsl(32, distancePercent, 50)(v.distanceFromHome), ' miles)', ' - ', chalk_1.default.hsl(32, agePercent, 50)(moment_1.default(v.firstSeen).fromNow()), ' ago');
    console.log('   ', v.website);
}
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        const vehicles = yield fetch_1.fetchVehicleMatches();
        vehicles.forEach(printVehicle);
    });
}
main().catch(console.error);
//# sourceMappingURL=cli.js.map