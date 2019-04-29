import fetch from 'node-fetch';
// import { inspect } from 'util';
import * as _ from 'lodash';
import chalk from 'chalk';
import { distanceFromHome } from './distance';
import * as moment from 'moment';
import { LocalStorage } from 'node-localstorage';
let localStorage: LocalStorage;

async function load() {
  if (typeof localStorage === 'undefined' || localStorage === null) {
    let nodeLocalStorage = await import('node-localstorage');
    const LocalStorage = nodeLocalStorage.LocalStorage;
    localStorage = new LocalStorage('./data');
  }
}

interface Vehicle {
  lat: number;
  lon: number;
  distanceFromHome: any;
  firstSeen: any;
  vehicleDesc: string;
  url: string;
  modelYearCode: string;
  statusCode: string;
  modelYear: number;
  specs: { attributes: [{ name: string; value: any }] };
  vin: string;
  dealerState: string;
  website: string;
  zip: number;
  dealerCode: string;
}

interface Dealer {
  dealerState: string;
  website: string;
  dealerCode: string;
}

// const qs =
//   'attributes=cab:Mega%20Cab&func=SALES&includeIncentives=N&matchType=X&modelYearCode=IUT201914&optionCodes=ESA&pageNumber=1&pageSize=10&radius=100&sortBy=0&zip=95120';

// https://www.easymapmaker.com/
const zips = [
  // 95032, // Los Gatos
  96001, // Redding
  95928, // Chico
  95482, // Ukiah
  95548, // Klamath
  96024, // Douglas City
  95540, // Fortuna
  96161, // Truckee
  96130, // Susanville
  95901, // Marysville
  95815, // Sacramento
  94954, // Petaluma
  95315, // Livingston
  93514, // Bishop
  93954, // San Lucas
  93726, // Fresno
  93305, // Bakersfield
  93534, // Lancaster
  92101, // San Diego
  92311, // Barstow
  93549, // Olancha
  93401, // San Luis
  93101, // Santa Barbara
  92280, // Rice
  92234 // Palm Springs
];

const options = {
  attributes: 'cab:Mega Cab',
  func: 'SALES',
  includeIncentives: 'N',
  matchType: 'X',
  optionCodes: 'ESA', // 6.4L Heavy Duty V8 HEMI
  // optionCodes: 'ETK', // 6.7L Cummins Diesel
  pageNumber: '1',
  pageSize: '1000',
  radius: '150',
  variation: 'BIG HORN,LARAMIE',
  // variation: 'LARAMIE',
  // variation: 'BIG HORN',
  sortBy: '0',
  modelYearCode: ''
};

async function fetchVehicles(zip: number, year: number) {
  const qs = Object.entries({
    ...options,
    ...{
      zip: zip,
      modelYearCode: `IUT${year}14`
    }
  })
    .map(([key, val]) => {
      // const val = options[key];
      return `${key}=${val}`;
    })
    .join('&');
  const json = await fetch(
    `https://www.ramtrucks.com/hostd/inventory/getinventoryresults.json?${qs}`
  ).then(res => res.json());
  return json.result.data.vehicles.map((v: Vehicle) => {
    v.zip = zip;
    return v;
  });
}

async function fetchDealers(zip: number) {
  const json = await fetch(
    `https://www.ramtrucks.com/bdlws/MDLSDealerLocator?zipCode=${zip}&func=SALES&radius=150&brandCode=R&resultsPerPage=999`,
    {
      method: 'GET'
    }
  ).then(res => res.json());
  return json.dealer.reduce(
    (acc: { [dealerCode: string]: Dealer }, d: Dealer) => {
      acc[d.dealerCode] = d;
      return acc;
    },
    {}
  );
}

async function fetchByZip(zip: number) {
  // console.log(`Fetching zip ${zip}...`);
  const years = [2018, 2019];
  return Promise.all([
    fetchDealers(zip),
    ...years.map(year => fetchVehicles(zip, year))
  ]);
}

function setWebsite(
  vehicle: Vehicle,
  dealers: { [dealerCode: string]: Dealer }
) {
  const dealer = dealers[vehicle.dealerCode];
  if (dealer) {
    vehicle.website = `${dealer.website}/catcher.esl?vin=${vehicle.vin}`;
    vehicle.dealerState = dealer.dealerState;
  } else {
    vehicle.website = 'not-found';
  }
  return vehicle;
}

const asyncLimit = function(fn: any, n: number) {
  let pendingPromises: Promise<any>[] = [];
  return async function(this: any, ...args: any) {
    while (pendingPromises.length >= n) {
      await Promise.race(pendingPromises).catch(() => {});
    }

    const p = fn.apply(this, args);
    pendingPromises.push(p);
    await p.catch(() => {});
    pendingPromises = pendingPromises.filter(pending => pending !== p);
    return p;
  };
};

async function getAllVehicles(): Promise<Vehicle[]> {
  const limitedFetchByZip = asyncLimit(fetchByZip, 20);
  // const requests = zips.map(fetchByZip);
  const requests = zips.map(limitedFetchByZip);
  const vehicles = await Promise.all(
    requests.map(byZip =>
      byZip.then(args => {
        const dealers = args[0];
        const vehiclesByYear = args.slice(1);
        const vehicles = vehiclesByYear.map((vehicles: Vehicle[]) =>
          vehicles.map(v => setWebsite(v, dealers))
        );
        return [].concat(...vehicles).filter((vehicle: Vehicle) => {
          return vehicle.dealerState === 'CA';
        });
      })
    )
  ).then(all => all.reduce((acc, list) => [...acc, ...list], []));

  const uniques = Object.values(
    vehicles.reduce((acc: { [vin: string]: Vehicle }, v: Vehicle) => {
      acc[v.vin] = v;
      return acc;
    }, {})
  ) as Vehicle[];
  return uniques;
}

function findMatches(vehicles: Vehicle[]) {
  const sixSeaters = vehicles.filter(v => {
    // console.log('vehicle:', v.specs.attributes);
    const capacity = v.specs.attributes.filter(
      (attr: { name: string }) => attr.name === 'Seats'
    )[0];
    // console.log(capacity);
    return capacity.value === 6;
  });

  sixSeaters.sort((a, b) => {
    const ret = a.modelYear - b.modelYear;
    if (ret !== 0) {
      return ret;
    }
    return a.website.localeCompare(b.website);
  });

  return sixSeaters;
}

function printVehicle(v: Vehicle) {
  v.modelYearCode = options.modelYearCode;
  v.url = getUrl(v);
  // console.log(inspect(v, false, Infinity, true));
  const vehicleDesc = v.vehicleDesc
    .replace('LARAMIE', chalk.black.bgWhite('LARAMIE'))
    .replace('BIG HORN', chalk.white.bgRed('BIG HORN'));
  const isNew = (Date.now() - v.firstSeen.getTime()) / 60000 < 60; // minutes
  console.log(
    isNew ? chalk.white.bgGreen('** New **') : '',
    v.modelYear,
    vehicleDesc,
    `(${v.zip}, ${v.dealerState}, ${v.distanceFromHome} miles) - ${moment(
      v.firstSeen
    ).fromNow()} ago`
  );
  console.log('   ', v.website);
}

function setDistanceFromHome(v: Vehicle) {
  const numberFormatter = new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0
  });
  v.distanceFromHome = numberFormatter.format(distanceFromHome(v.lat, v.lon));
}

function updateHistory(vehicles: Vehicle[]) {
  const history = JSON.parse(localStorage.getItem('vehicles') || '{}');
  vehicles.forEach(v => {
    const h = history[v.vin];
    v.firstSeen = h ? new Date(h.firstSeen) : new Date();
    history[v.vin] = v;
  });
  // console.log(history);
  localStorage.setItem('vehicles', JSON.stringify(history));
}

async function main() {
  await load();
  const vehicles = await getAllVehicles();
  const sixSeaters = findMatches(vehicles);
  sixSeaters.forEach(setDistanceFromHome);
  updateHistory(sixSeaters);

  sixSeaters.forEach(printVehicle);

  // console.log(inspect(sixSeaters[0], false, Infinity, true));

  console.log(
    `vehicles: ${vehicles.length}, six seaters: ${sixSeaters.length}`
  );
}

function getUrl({
  modelYearCode,
  vin,
  dealerCode,
  statusCode
}: {
  modelYearCode: string;
  vin: string;
  dealerCode: string;
  statusCode: string;
}) {
  return `https://www.ramtrucks.com/new-inventory/vehicle-details.html?modelYearCode=${modelYearCode}&vin=${vin}&dealerCode=${dealerCode}&radius=100&matchType=X&statusCode=${statusCode}`;
}

// https://www.normandinchryslerjeep.net/catcher.esl?vin=3C6UR5DL0JG375366
// https://www.ramtrucks.com/new-inventory/vehicle-details.html?modelYearCode=IUT201814&vin=3C6UR5DL0JG375366&dealerCode=08564&radius=100&matchType=X&statusCode=KZX
main().catch(console.error);
