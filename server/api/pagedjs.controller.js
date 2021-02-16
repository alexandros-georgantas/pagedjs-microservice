const express = require('express')
const { logger } = require('@coko/server')
const fs = require('fs-extra')
const path = require('path')
const { authenticate } = require('@coko/service-auth')
const crypto = require('crypto')
const config = require('config')

const { exec } = require('child_process')
const {
  uploadHandler,
  removeFrameGuard,
  readFile,
  downloadImage,
  imageGatherer,
  fixImagePaths,
  writeFile,
} = require('./helpers')

const conversionHandler = async (req, res) => {
  try {
    if (req.fileValidationError) {
      return res.status(400).json({ msg: req.fileValidationError })
    }
    if (!req.file) {
      return res.status(400).json({ msg: 'zip file is not included' })
    }
    const { path: filePath } = req.file
    const id = crypto.randomBytes(16).toString('hex')
    const outputFile = `temp/${id}/output.pdf`
    const out = `temp/${id}`
    fs.ensureDir(out)
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
    const bookContent = await readFile(`temp/${id}/index.html`)
    const bookImages = imageGatherer(bookContent)
    await Promise.all(
      bookImages.map(async image => {
        const { url, objectKey } = image
        return downloadImage(url, `temp/${id}/${objectKey}`)
      }),
    )

    const fixedContent = fixImagePaths(bookContent)
    await fs.remove(`temp/${id}/index.html`)
    await writeFile(`temp/${id}/index.html`, fixedContent)
    await new Promise((resolve, reject) => {
      exec(
        `/home/node/pagedjs/node_modules/.bin/pagedjs-cli -i temp/${id}/index.html -o ${outputFile}`,
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
    fs.createReadStream(outputFile).pipe(res)
  } catch (e) {
    throw new Error(e)
  }
}

const previewerLinkHandler = async (req, res) => {
  try {
    if (req.fileValidationError) {
      return res.status(400).json({ msg: req.fileValidationError })
    }
    if (!req.file) {
      return res.status(400).json({ msg: 'zip file is not included' })
    }
    const { path: filePath } = req.file
    const id = new Date().getTime() // this is the current timestamp, this is due to cron clean up purposes
    const { protocol, host, port, externalURL } = config.get('pubsweet-server')
    let serverUrl
    if (externalURL) {
      serverUrl = externalURL
    } else {
      serverUrl = `${protocol}://${host}${port ? `:${port}` : ''}`
    }
    const out = `${path.join(__dirname, '..', 'static', `${id}`)}`
    fs.ensureDir(out)
    await new Promise((resolve, reject) => {
      exec(
        `unzip ${filePath} -d ${path.join(__dirname, '..', 'static', `${id}`)}`,
        (error, stdout, stderr) => {
          if (error) {
            return reject(error)
          }
          return resolve(stdout || stderr)
        },
      )
    })

    let cssFile
    fs.readdirSync(`${path.join(__dirname, '..', 'static', `${id}`)}`).forEach(
      file => {
        const deconstruct = file.split('.')
        if (deconstruct[1] === 'css') {
          cssFile = file
        }
      },
    )
    res.status(200).json({
      link: `${serverUrl}/previewer/index.html?url=${id}/index.html&stylesheet=${id}/${cssFile}`,
    })
  } catch (e) {
    throw new Error(e)
  }
}

const htmlToPDFBackend = app => {
  app.post('/api/htmlToPDF', authenticate, uploadHandler, conversionHandler)
  app.post(
    '/api/getPreviewerLink',
    authenticate,
    uploadHandler,
    previewerLinkHandler,
  )
  app.use(
    '/previewer',
    removeFrameGuard,
    express.static(path.join(__dirname, '..', 'static')),
  )
}

module.exports = htmlToPDFBackend
