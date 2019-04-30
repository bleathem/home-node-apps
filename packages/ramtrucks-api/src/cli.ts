import chalk from 'chalk';
import moment from 'moment';

import { fetchVehicleMatches, Vehicle } from './fetch';

function printVehicle(v: Vehicle, index: number) {
  // console.log(inspect(v, false, Infinity, true));
  const vehicleDesc = v.vehicleDesc
    .replace('LARAMIE', chalk.rgb(212, 154, 106)('LARAMIE'))
    .replace('BIG HORN', chalk.rgb(170, 108, 57)('BIG HORN'));
  const isNew = (Date.now() - v.firstSeen.getTime()) / 60000 < 60; // minutes
  const isGone = Date.now() - v.lastSeen.getTime() > 3600;
  const distancePercent = 100 - Math.min(v.distanceFromHome / 5, 100);
  const agePercent =
    100 - Math.min(moment(Date.now()).diff(moment(v.firstSeen), 'hours'), 100);
  console.log(
    `${index}) `,
    isNew ? chalk.white.bgGreen('** New **') : '',
    isGone ? chalk.white.bgRed('** Gone **') : '',
    v.modelYear
      .toString()
      .replace('2018', chalk.rgb(64, 127, 127)('2018'))
      .replace('2019', chalk.rgb(34, 102, 102)('2019')),
    vehicleDesc,
    `(${v.zip}, ${v.dealerState}, `,
    chalk.hsl(32, distancePercent, 50)(v.distanceFromHome),
    ' miles)',
    ' - ',
    chalk.hsl(32, agePercent, 50)(moment(v.firstSeen).fromNow()),
    ' ago'
  );
  console.log('   ', v.website);
}

async function main() {
  const vehicles = await fetchVehicleMatches();
  vehicles.forEach(printVehicle);
  // console.log(inspect(vehicles[0], false, Infinity, true));
}
main().catch(console.error);
