#!/usr/bin/env node
const config = require('config')
const { logger } = require('@coko/server')

const { models } = require('@coko/service-auth/src/models')

const { ServiceClient } = models

const main = async () => {
  try {
    const isProduction = process.env.NODE_ENV === 'production'

    let clientID
    let clientSecret

    // for production allow undefined for clientID and clientSecret for the case of manual script execution
    if (isProduction) {
      clientID = config.has('clientID') && config.get('clientID')
      clientSecret = config.has('clientSecret') && config.get('clientSecret')
    } else {
      // for development make sure that you will have values for clientID and clientSecrete regardless of env values
      clientID =
        (config.has('clientID') && config.get('clientID')) ||
        '59a3392b-0c4f-4318-bbe2-f86eff6d3de4'
      clientSecret =
        (config.has('clientSecret') && config.get('clientSecret')) ||
        'asldkjLKJLaslkdf897kjhKUJH'
    }

    // case where you haven't provided values via env and you will manually generate them, so do nothing here
    if (isProduction && (!clientID || !clientSecret)) {
      return false
    }

    if (!clientID) {
      throw new Error('clientID is undefined')
    }

    if (!clientSecret) {
      throw new Error('clientSecrete is undefined')
    }

    const exists = await ServiceClient.query().findById(clientID)

    if (!exists) {
      logger.info('seeding new client')

      const dbClient = await ServiceClient.query().insert({
        id: clientID,
        clientSecret,
      })

      logger.info(`Your clientID is ${dbClient.id}`)
      logger.info(`Your clientSecret is ${dbClient.id}`)
      return true
    }

    logger.info('already exists')
    return false
  } catch (e) {
    throw new Error(e)
  }
}

main()
