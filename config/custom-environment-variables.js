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
    port: 'SERVER_PORT',
    publicURL: 'PUBLIC_URL',
  },
}
