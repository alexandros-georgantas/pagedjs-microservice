const winston = require('winston')
const path = require('path')
const components = require('./components')

const logger = new winston.Logger({
  transports: [
    new winston.transports.Console({
      colorize: true,
    }),
  ],
})

module.exports = {
  authsome: {
    mode: path.join(__dirname, 'authsome.js'),
  },

  publicKeys: ['pubsweet', 'pubsweet-server'],
  pubsweet: {
    components,
  },
  'pubsweet-server': {
    db: {},
    logger,
    port: 3000,
    useGraphQLServer: false,
    pool: { min: 0, max: 10, idleTimeoutMillis: 1000 },
  },
}
