const pagedJSEndpoint = require('./api')

module.exports = {
  server: () => app => pagedJSEndpoint(app),
}
