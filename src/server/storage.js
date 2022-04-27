const Datastore = require('nedb');
const crypto = require('crypto');

const { dripActions } = require('./config');
const { DRIP_TYPE } = require('../constants');

const SECOND  = 1000;
const MINUTE  = 60 * SECOND; 
const HOUR    = 60 * MINUTE;
const DAY     = 20 * HOUR; // almost 1 day, give some room for people missing their normal daily slots

const CompactionTimeout = 10 * SECOND;

const sha256 = x =>
  crypto
    .createHash('sha256')
    .update(x, 'utf8')
    .digest('hex');

const now = () => new Date().getTime();

class Storage {
  constructor(filename = './storage.db', autoload = true) {
    this._db = new Datastore({ filename, autoload });
  }

  async close() {
    this._db.persistence.compactDatafile();

    return new Promise((resolve, reject) => {
      this._db.on('compaction.done', () => {
        this._db.removeAllListeners('compaction.done');
        resolve();
      });

      setTimeout(() => {
        resolve();
      }, CompactionTimeout);
    });
  }

  async isValid(username, addr, dripType = DRIP_TYPE.NORMAL, span = DAY) {
    const limit = dripActions[dripType].timesLimit;

    username = sha256(username);
    addr = sha256(addr);

    const totalUsername = await this._query(username, span, dripType);
    const totalAddr = await this._query(addr, span, dripType);

    if (totalUsername < limit && totalAddr < limit) {
      return true;
    }

    return false;
  }

  async saveData(username, addr, dripType) {
    username = sha256(username);
    addr = sha256(addr);

    await this._insert(username, dripType);
    await this._insert(addr, dripType);
    return true;
  }

  async _insert(item, dripType) {
    const timestamp = now();

    return new Promise((resolve, reject) => {
      this._db.insert({ item, dripType, timestamp }, (err) => {
        if (err) reject(err);
        resolve();
      });
    });
  }

  async _query(item, span, dripType) {
    const timestamp = now();

    const query = {
      $and: [
        {item},
        {timestamp: { $gt: timestamp - span }},
        { dripType }
      ],
    };

    return new Promise((resolve, reject) => {
      this._db.find(query, (err, docs) => {
        if (err) reject();
        resolve(docs.length);
      });
    });
  }
}

module.exports = Storage;
