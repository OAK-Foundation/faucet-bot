const { WsProvider, ApiPromise } = require('@polkadot/api');
const pdKeyring = require('@polkadot/keyring');
const uuid = require('uuid');

const { SS58_PREFIX } = require('../constants');

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

  async drip(address, amount) {
    const transfer = this.api.tx.balances.transfer(address, amount);
    const hash = await transfer.signAndSend(this.account, { nonce: -1 });
    return { hash: hash.toHex() };
  }

  async dripLater(address, amount, timestamp) {
    const providerId = uuid.v4();

    const extrinsic = this.api.tx.automationTime.scheduleNativeTransferTask(uuid.v4(), Math.floor(timestamp/1000), address, amount);
    const hash = await extrinsic.signAndSend(this.account, { nonce: -1 });
    return { hash: hash.toHex(), providerId };
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
