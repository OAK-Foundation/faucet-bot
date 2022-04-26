const express = require('express');
const bodyParser = require('body-parser');
const moment = require('moment');

const Actions = require('./actions');
const Storage = require('./storage');
const config = require('./config');
const { DRIP_TYPE } = require('../constants');

const storage = new Storage();
const app = express();
app.use(bodyParser.json());

app.get('/health', (_, res) => {
  res.send('Faucet backend is healthy.');
});

const createAndApplyActions = async () => {
  const { mnemonic, polkadot } = config;
  const actions = new Actions();
  await actions.create({ mnemonic, polkadot });

  app.get('/balance', async (_, res) => {
    const balance = await actions.checkBalance();
    res.send(balance.toString());
  });
  
  app.post('/drip', async (req, res) => {
    const { address, sender, dripType } = req.body;
    if (!(await storage.isValid(sender, address, dripType))) {
      res.send('LIMIT');
    } else {
      storage.saveData(sender, address, dripType);
      const dripResult = await actions.processDrip(req.body);
      res.send(dripResult);
    }
  });
}

const main = async () => {
  const { port } = config;
  await createAndApplyActions();
  app.listen(port, () => console.log(`Faucet backend listening on port ${port}.`));
}

try {
  main();
} catch (e) { console.error(e); }
