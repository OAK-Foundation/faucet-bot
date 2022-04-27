const moment = require('moment');
const _ = require('lodash');

const getNextHourStr = () => moment().utc().add(1, 'hours').format('YYYY-MM-DD [at] hA');

const parseTime = (time) => {
  try {
    const matches = /^(\d+)-(\d+)-(\d+) at (\d+)(AM|PM)/s.exec(time);
    if (!matches) {
      return null;
    }

    const year = Number(matches[1]);
    const month = Number(matches[2]);
    const day = Number(matches[3]);

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

module.exports = { getNextHourStr, parseTime };
