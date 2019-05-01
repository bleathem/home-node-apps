import express, { Request, Response, NextFunction } from 'express';
const app = express();
const port = 8080;
import { fetchVehicleMatches } from 'ramtrucks-api';

app.get('/trucks', async function(
  _req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const vehicles = await fetchVehicleMatches();
    res.json(vehicles);
  } catch (e) {
    next(e);
  }
});

app.get('/', (_req: Request, res: Response) => res.send('Hello World2!'));

app.listen(port, () => console.log(`Example app listening on port ${port}!`));
