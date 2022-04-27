const { WsProvider, ApiPromise } = require('@polkadot/api');
const pdKeyring = require('@polkadot/keyring');
const uuid = require('uuid');
const moment = require('moment');

const { DRIP_TYPE, SS58_PREFIX } = require('../constants');
const { dripActions, units } = require('./config');

class Actions {
  async create({ mnemonic, polkadot }) {
    const { endpoint } = polkadot;
    const provider = new WsProvider(endpoint);
    this.api = await ApiPromise.create({ provider });
    console.log('Polkadot API initialized successfully!');
    const keyring = new pdKeyring.Keyring({ type: 'sr25519' });
    keyring.setSS58Format(SS58_PREFIX);
    this.account = keyring.addFromMnemonic(mnemonic);
  }

  async sendExtrinsic (extrinsic, signer) {
    const unsub = await extrinsic.signAndSend(signer, { nonce: -1 }, ({ status }) => {
      console.log(`Extrinsic status is ${status}`);
      if (status.isInBlock) {
        console.log(`Extrinsic included at blockHash ${status.asInBlock}`);
      } else if (status.isFinalized) {
        console.log(`Extrinsic finalized at blockHash ${status.asFinalized}`);
        unsub();
      }
    });
  }

  async processDrip ({ dripType, ...params})  {
    console.log(`processDrip, dripType: ${dripType}, params: `, params);
    switch (dripType) {
      case DRIP_TYPE.NORMAL: 
        return await this.drip(params);
      case DRIP_TYPE.LATER: 
        return await this.dripLater(params);
      case DRIP_TYPE.SWAG: 
        return this.dripSwag(params);
      default:
    }
    return null;
  }

  async drip({ address }) {
    const amount = dripActions[DRIP_TYPE.NORMAL].amount * units;
    const extrinsic = this.api.tx.balances.transfer(address, amount);
    await this.sendExtrinsic(extrinsic, this.account);
    return { hash: extrinsic.hash.toHex() };
  }

  async dripLater({ address, dripTime }) {
    const amount = dripActions[DRIP_TYPE.LATER].amount * units;
    const providerId = uuid.v4();
    const executionTime = Math.floor(dripTime / 1000);
    const extrinsic = this.api.tx.automationTime.scheduleNativeTransferTask(providerId, [executionTime], address, amount);
    await this.sendExtrinsic(extrinsic, this.account);
    return { hash: extrinsic.hash.toHex(), providerId };
  }

  async dripSwag({ address }) {
    const amount = dripActions[DRIP_TYPE.SWAG].amount * units;
    const providerId = uuid.v4();

    const now = moment().utc();
    const executionTimes = [];
    for (let i = 1; i <= 24; i += 1) {
      executionTimes.push(Math.ceil(now.add(i, 'hours').valueOf() / 1000));
    }

    const extrinsic = this.api.tx.automationTime.scheduleNativeTransferTask(providerId, executionTimes, address, amount);
    await this.sendExtrinsic(extrinsic, this.account);
    return { hash: extrinsic.hash.toHex(), providerId };
  }

  async checkBalance() {
    let balance = 0;
    try {
      const { data: { free } } = await this.api.query.system.account(this.account.address);
      balance = free;
    } catch (error) {
      console.error('Check balance failed. error: ', error);
    }
    return balance;
  }
}

module.exports = Actions;
