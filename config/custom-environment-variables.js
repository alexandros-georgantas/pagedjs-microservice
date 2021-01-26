module.exports = {
  'pubsweet-server': {
    secret: 'PUBSWEET_SECRET',
    db: {
      user: 'POSTGRES_USER',
      password: 'POSTGRES_PASSWORD',
      host: 'POSTGRES_HOST',
      database: 'POSTGRES_DB',
      port: 'POSTGRES_PORT',
    },
    host: 'SERVER_HOST',
    port: 'SERVER_PORT',
    externalURL: 'EXTERNAL_URL',
    protocol: 'SERVER_PROTOCOL',
  },
}
