const Discord = require('discord.js');
const axios = require('axios');
const _ = require('lodash');

const config = require('./config');
const actions = require('./actions');
const { getNextHourStr } = require('./helperFn');

// Check environment variables valid
if (!process.env.ACCESS_TOKEN) {
  throw Error('Launch failed. ACCESS_TOKEN evironment variable is not set.');
}

const { tokenSymbol, units } = config;

let ax = axios.create({
  baseURL: process.env.BACKEND_URL || 'http://127.0.0.1:5555',
  timeout: 10000,
});

const client = new Discord.Client({ intents: [Discord.GatewayIntentBits.Guilds, Discord.GatewayIntentBits.MessageContent] });
client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

client.on('messageCreate', async msg => {
  const { content, author: { id: sender } } = msg;
  let args = _.split(content, /[\s\n]+/);
  const [ action ] = args;

  if (action === '!balance') {
    const res = await ax.get('/balance');
    const balance = res.data;

    msg.reply(`The faucet has ${balance/units} ${tokenSymbol}s remaining.`, `The faucet has ${balance/units} ${tokenSymbol}s remaining.`);
  }

  if (action === '!drip') {
    msg.reply(await actions.drip(sender, args[1]));
    return;
  }

  if (action === '!drip-later') {
    msg.reply(await actions.dripLater(sender, args[1], _.join(_.slice(args, 2), ' ')));
    return;
  }

  if (action === '!drip-swag') {
    msg.reply(await actions.dripSwag(sender, args[1]));
    return;
  }

  if (action === '!faucet') {
    msg.reply(`
Usage:
  !balance - Get the faucet's balance.
  !drip <Address> - Send ${tokenSymbol}s to <Address>.
  !drip-later <Address> <Time> - Send ${tokenSymbol}s to <Address> later. Time format(UTC): ${getNextHourStr()}
  !drip-swag <Address> - For the next 24 hours, Send ${tokenSymbol}s to <Address> per hour.
  !faucet - Prints usage information.`);
  }
});

client.login(process.env.ACCESS_TOKEN);