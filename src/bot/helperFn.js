const moment = require('moment');

const getNextHourStr = () => moment().utc().add(1, 'hours').format('MM-DD-YYYY [at] hA');

module.exports = { getNextHourStr };
