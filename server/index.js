const htmlToPDFEndpoint = require('./api')

module.exports = {
  server: () => app => htmlToPDFEndpoint(app),
}
