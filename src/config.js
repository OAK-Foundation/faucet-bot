const config = {
  networkName: 'Neumann Network',
  tokenSymbol: 'TUR',
  units: 10**10,
  dripActions: {
    normal: {
      amount: 100,
      timesLimit: 1,
    },
    later: {
      amount: 100,
      maxScheduleSeconds: 7 * 24 * 60 * 60,
      timesLimit: 3,
    },
    swag: {
      amount: 10,
      timesLimit: 1,
    },
  },
};

module.exports = config;
