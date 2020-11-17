#!/usr/bin/env node
const { logger } = require('@coko/server')

const { models } = require('@coko/service-auth/src/models')

const { ServiceClient } = models

const main = async () => {
  try {
    const exists = await ServiceClient.query().findById(
      '59a3392b-0c4f-4318-bbe2-f86eff6d3de4',
    )
    if (!exists) {
      logger.info('seeding new client')
      const dbClient = await ServiceClient.query().insert({
        id: '59a3392b-0c4f-4318-bbe2-f86eff6d3de4',
        clientSecret: 'asldkjLKJLaslkdf897kjhKUJH',
      })
      logger.info(`Your clientID is ${dbClient.id}`)
      logger.info('Your clientSecret is asldkjLKJLaslkdf897kjhKUJH')
      return true
    }
    logger.info('already exists')
  } catch (e) {
    throw new Error(e)
  }
}

main()
