const { cron } = require('@coko/server')
const fs = require('fs-extra')
const path = require('path')

// Clean-up static folder every Sunday @ 08:05 am
cron.schedule('5 8 * * Sun', async () => {
  try {
    fs.readdir(
      `${path.join(__dirname, '..', 'static')}`,
      async (err, files) => {
        if (err) {
          throw new Error(err)
        }

        await Promise.all(
          files.map(async file => {
            if (
              fs
                .lstatSync(
                  path.resolve(`${path.join(__dirname, '..', 'static')}`, file),
                )
                .isDirectory()
            ) {
              const EIGHTHOURS = 1000 * 60 * 60 * 8
              const eightHoursAgo = new Date().getTime() - EIGHTHOURS

              if (file <= eightHoursAgo) {
                await fs.remove(path.join(__dirname, '..', 'static', file))
              }
            }
          }),
        )
      },
    )
  } catch (e) {
    throw new Error(e)
  }
})
