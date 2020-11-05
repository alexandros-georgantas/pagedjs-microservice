const logger = require('@pubsweet/logger')
const fs = require('fs-extra')
const path = require('path')
const { authenticate } = require('@coko/service-auth')
const crypto = require('crypto')

const { exec } = require('child_process')
const { uploadHandler } = require('./helpers')

const conversionHandler = async (req, res) => {
  try {
    if (req.fileValidationError) {
      return res.status(400).json({ msg: req.fileValidationError })
    }
    if (!req.file) {
      return res.status(400).json({ msg: 'HTML file is not included' })
    }
    const { path: filePath } = req.file
    const id = crypto.randomBytes(16).toString('hex')
    const outputFile = `temp/${id}/output.pdf`

    const pagedCLI = path.join(
      `${process.cwd()}/`,
      '..',
      'pagedjs-cli/bin/paged -i',
    )
    logger.info(`unzipping file in temp/${id}`)
    await new Promise((resolve, reject) => {
      exec(`unzip ${filePath} -d temp/${id}`, (error, stdout, stderr) => {
        if (error) {
          return reject(error)
        }
        return resolve(stdout || stderr)
      })
    })
    logger.info(`removing ${filePath}`)
    await fs.remove(filePath)
    logger.info(`creating pdf`)
    await new Promise((resolve, reject) => {
      exec(
        `${pagedCLI} temp/${id}/index.html -o ${outputFile}`,
        (error, stdout, stderr) => {
          if (error) {
            return reject(error)
          }
          return resolve(stdout || stderr)
        },
      )
    })

    if (!fs.existsSync(outputFile)) {
      return res.status(500).json({ msg: 'Error, file was not created' })
    }
    res.writeHead(200, {
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename=output.pdf`,
    })
    res.on('finish', async () => {
      logger.info(`removing folder temp/${id}`)
      await fs.remove(`temp/${id}`)
    })
    return fs.createReadStream(outputFile).pipe(res)
  } catch (e) {
    throw new Error(e)
  }
}

const htmlToPDFBackend = app => {
  app.post('/api/htmlToPDF', authenticate, uploadHandler, conversionHandler)
}

module.exports = htmlToPDFBackend
