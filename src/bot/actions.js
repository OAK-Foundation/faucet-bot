const _ = require('lodash');
const moment = require('moment');
const pdKeyring = require('@polkadot/keyring');
const axios = require('axios');

const { DRIP_TYPE, SS58_PREFIX } = require("../constants");
const { tokenSymbol, networkName, dripActions } = require('./config');
const { getNextHourStr, parseTime } = require('./helperFn');

const { later: { maxScheduleSeconds } } = dripActions;

const keyring = new pdKeyring.Keyring({ type: 'sr25519' });
keyring.setSS58Format(SS58_PREFIX);

let ax = axios.create({
  baseURL: process.env.BACKEND_URL || 'http://127.0.0.1:5555',
  timeout: 10000,
});

const isValidAddress = (address) => {
  try {
    keyring.decodeAddress(address);
  } catch (error) {
    return false;
  }
  return true;
}

const requestDrip = ({
  sender,
  address,
  dripType,
  dripTime,
}) => ax.post('/drip', {
  sender,
  address,
  dripType,
  dripTime,
});

const drip = async (sender, address) => {
	if (_.isEmpty(address)) {
    return 'Please enter a wallet address after !drip.';
  }

  if (!isValidAddress(address)) {
    return `The address ${address} entered is incompatible to ${networkName}.`;
  }

  const res = await requestDrip({
    sender,
    address,
    dripType: DRIP_TYPE.NORMAL,
  });

  if (res.data === 'LIMIT') {
    return `Your Discord ID or the address has reached its daily quota. Please request only once every 24 hours.`;
  }
  
  const { amount } = dripActions[DRIP_TYPE.NORMAL];

  return `I just sent ${amount} ${tokenSymbol} to ${address}. Extrinsic hash: ${res.data.hash}.\n\nTry out our recurring payment feature on https://ace.web3go.xyz ! (Click on Connect at the top right corner to select Turing Staging network)`;
}

module.exports = { drip, dripLater, dripSwag };
