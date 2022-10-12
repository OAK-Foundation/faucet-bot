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

  return `I just sent ${amount} ${tokenSymbol} to address ${address}. Extrinsic hash: ${res.data.hash}.\nTry out our recurring payment feature on https://ace.web3go.xyz! (Click on Connect at the top right corner to select Turing Staging network)`;
}

const dripLater = async (sender, address, time) => {
	if (_.isEmpty(address)) {
    return 'please enter a wallet address after !drip-later.';
  }

  if (!isValidAddress(address)) {
    return `The address ${address} entered is incompatible to ${networkName}.`;
  }

  const dripTime = parseTime(time);
  if (!dripTime) {
    return `Please enter the specified time format(UTC). Example: !drip-later address ${getNextHourStr()}`;
  }
  if (dripTime.isBefore(moment())) {
    return "The time in UTC must be in the future.";
  }
  if (dripTime.isAfter(moment().add(maxScheduleSeconds, 'seconds'))) {
    return `The time in UTC cannot be farther than ${moment.duration(maxScheduleSeconds, 'seconds').asDays()} days.`;
  }

  const res = await requestDrip({
    sender,
    address,
    dripType: DRIP_TYPE.LATER,
    dripTime: dripTime.valueOf(),
  });

  if (res.data === 'LIMIT') {
    return `Your Discord ID or the address has reached its daily quota. Please request 3 times every 24 hours.`;
  }
  
  const { amount } = dripActions[DRIP_TYPE.LATER];
  const { data: { hash, providerId } } = res;

  return `I will send ${amount} ${tokenSymbol} to address ${address} at ${time} UTC. Extrinsic hash: ${hash}. Your provided_id: ${providerId}.`;
}

const dripSwag = async (sender, address) => {
	if (_.isEmpty(address)) {
    return 'please enter a wallet address after !drip-swag.';
  }

  if (!isValidAddress(address)) {
    return `The address ${address} entered is incompatible to ${networkName}.`;
  }

  const res = await requestDrip({
    sender,
    address,
    dripType: DRIP_TYPE.SWAG,
  });

  if (res.data === 'LIMIT') {
    return `Your Discord ID or the address has reached its daily quota. Please request only once every 24 hours.`;
  }

  const { amount } = dripActions[DRIP_TYPE.SWAG];
  const { data: { hash, providerId } } = res;

  return `For the next 24 hours, I will send ${amount} ${tokenSymbol} to address ${address} per hour. Extrinsic hash: ${hash}. Your provided_id: ${providerId}.`;
}

module.exports = { drip, dripLater, dripSwag };
