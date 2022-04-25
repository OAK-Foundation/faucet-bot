const _ = require('lodash');
const moment = require('moment');
const pdKeyring = require('@polkadot/keyring');
const axios = require('axios');

const { DRIP_TYPE, SS58_PREFIX } = require("../constants");
const { tokenSymbol, sendAmount, units, networkName, maxScheduleSeconds } = require('./config');

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
  amount,
  dripType,
}) => ax.post('/drip', {
  sender,
  address,
  amount,
  dripType,
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
    amount: sendAmount * units,
    dripType: DRIP_TYPE.NORMAL,
  });

  if (res.data === 'LIMIT') {
    return `Your Discord ID or the address has reached its daily quota. Please request only once every 24 hours.`;
  }
  return `I just sent ${sendAmount} ${tokenSymbol} to address ${address}. Extrinsic hash: ${res.data.hash}.`;
}

const parseTime = (time) => {
  try {
  const matches = /^(\d+)-(\d+)-(\d+) at (\d+)(AM|PM)/s.exec(time);
  if (!matches) {
    return null;
  }

  const month = Number(matches[1]);
  const day = Number(matches[2]);
  const year = Number(matches[3]);
  const noon = matches[5];

  let hour = Number(matches[4]);
  hour = noon === 'PM' ? hour + 12 : hour;
  
  const timeStr = `${_.padStart(year, 4, '0')}-${_.padStart(month, 2, '0')}-${_.padStart(day, 2, '0')}T${_.padStart(hour, 2, '0')}:00:00.000Z`;

  const newTime = moment(timeStr);
  if (!newTime.isValid()) {
    return null;
  }
  
  return newTime;
  } catch (error) {
    return null;
  }
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
    return `Please enter the specified time format(UTC). Example: !drip-later address <4/14 at 5pm>`;
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
    amount: sendAmount * units,
    dripType: DRIP_TYPE.LATER,
    dripTime: dripTime.valueOf(),
  });

  if (res.data === 'LIMIT') {
    return `Your Discord ID or the address has reached its daily quota. Please request 3 times every 24 hours.`;
  }

  const { data: { hash, providerId } } = res;
  return `I will send ${sendAmount} NEU to address ${address} at ${time} UTC. Extrinsic hash: ${hash}. Your provided_id: ${providerId}.`;
}

module.exports = { drip, dripLater };
