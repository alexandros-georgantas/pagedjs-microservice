#!/usr/bin/env node
const { createServiceClientFromEnvironment } = require('@coko/service-auth')

const main = async () => {
  try {
    return createServiceClientFromEnvironment()
  } catch (e) {
    throw new Error(e)
  }
}

main()
