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
  indexHTMLPreparation,
  findHTMLFile,
} = require('./helpers')

const { pagedjsVersion } = require('./constants')

const conversionHandler = async (req, res) => {
  const id = crypto.randomBytes(16).toString('hex')

  try {
    const isPDF = true

    if (req.fileValidationError) {
      return res.status(400).json({ msg: req.fileValidationError })
    }

    if (!req.file) {
      return res.status(400).json({ msg: 'zip file is not included' })
    }

    const { path: filePath } = req.file
    const outputFile = `temp/${id}/output.pdf`

    fs.ensureDir('temp')

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

    const HTMLfilename = await findHTMLFile(`temp/${id}`)

    if (!fs.existsSync(`temp/${id}/${HTMLfilename}`)) {
      return res.status(500).json({ msg: 'Error, HTML file does not exists' })
    }

    logger.info(`found main HTML file with name ${HTMLfilename}`)

    logger.info(`creating processed HTML file`)

    await indexHTMLPreparation(`temp/${id}`, {}, isPDF, HTMLfilename)

    let additionalScriptsParam = ''
    logger.info(`checking for additional pagedjs scripts`)
    fs.readdirSync(`temp/${id}`).forEach(file => {
      const deconstruct = file.split('.')

      if (deconstruct[1] === 'js') {
        additionalScriptsParam += `--additional-script temp/${id}/${file} `
      }
    })
    logger.info(`triggering pagedjs-cli for the PDF creation`)
    await new Promise((resolve, reject) => {
      if (additionalScriptsParam.length > 0) {
        exec(
          `/home/node/pagedjs/node_modules/.bin/pagedjs-cli -i temp/${id}/${HTMLfilename.replace(
            /(?=[() ])/g,
            '\\',
          )} ${additionalScriptsParam.trim()} -o ${outputFile}`,
          (error, stdout, stderr) => {
            if (error) {
              return reject(error)
            }

            return resolve(stdout || stderr)
          },
        )
      } else {
        exec(
          `/home/node/pagedjs/node_modules/.bin/pagedjs-cli -i temp/${id}/${HTMLfilename.replace(
            /(?=[() ])/g,
            '\\',
          )} -o ${outputFile}`,
          (error, stdout, stderr) => {
            if (error) {
              return reject(error)
            }

            return resolve(stdout || stderr)
          },
        )
      }
    })

    if (!fs.existsSync(outputFile)) {
      return res.status(500).json({ msg: 'Error, file was not created' })
    }

    res.on('finish', async () => {
      logger.info(`removing folder temp/${id}`)
      await fs.remove(`temp/${id}`)
    })

    req.on('error', async err => {
      logger.error(err.message)
      await fs.remove(`temp/${id}`)
    })

    res.writeHead(200, {
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename=output.pdf`,
    })

    return fs.createReadStream(outputFile).pipe(res)
  } catch (e) {
    return res.status(500).json({ msg: e.message })
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

    const options = {
      doublePageSpread: req.body.doublePageSpread || false,
      backgroundColor: req.body.backgroundColor || '#DCDCDC',
    }

    const { path: filePath } = req.file
    const id = new Date().getTime() // this is the current timestamp, this is due to cron clean up purposes
    const { publicURL, port } = config.get('pubsweet-server')
    const serverUrl = publicURL || `http://localhost${port ? `:${port}` : ''}`

    fs.ensureDir(`${path.join(__dirname, '..', 'static')}`)

    const out = `${path.join(__dirname, '..', 'static', `${id}`)}`

    fs.ensureDir(out)

    await new Promise((resolve, reject) => {
      exec(`unzip ${filePath} -d ${out}`, (error, stdout, stderr) => {
        if (error) {
          return reject(error)
        }

        return resolve(stdout || stderr)
      })
    })

    const HTMLfilename = await findHTMLFile(`server/static/${id}`)

    if (!fs.existsSync(out)) {
      return res.status(500).json({ msg: 'Error, HTML file does not exists' })
    }

    logger.info(`found main HTML file with name ${HTMLfilename}`)

    // generation of index.html
    await indexHTMLPreparation(out, options, false, HTMLfilename)

    return res.status(200).json({
      link: `${serverUrl}/previewer/${id}/index.html`,
    })
  } catch (e) {
    return res.status(500).json({ msg: e.message })
  }
}

const getToolsInfo = async (req, res) => {
  try {
    const nodeVersion = await new Promise((resolve, reject) => {
      exec(`node --version`, (error, stdout, stderr) => {
        if (error) {
          return reject(error)
        }

        return resolve(stdout.split('v')[1].trim() || stderr)
      })
    })

    const npmVersion = await new Promise((resolve, reject) => {
      exec(`npm --version`, (error, stdout, stderr) => {
        if (error) {
          return reject(error)
        }

        return resolve(stdout.trim() || stderr)
      })
    })

    const alpineVersion = await new Promise((resolve, reject) => {
      exec(`cat /etc/alpine-release`, (error, stdout, stderr) => {
        if (error) {
          return reject(error)
        }

        return resolve(stdout.trim() || stderr)
      })
    })

    const pythonVersion = await new Promise((resolve, reject) => {
      exec(`python3 --version`, (error, stdout, stderr) => {
        if (error) {
          return reject(error)
        }

        return resolve(stdout.split(' ')[1].trim() || stderr)
      })
    })

    const chromiumVersion = await new Promise((resolve, reject) => {
      exec(`chromium-browser --version`, (error, stdout, stderr) => {
        if (error) {
          return reject(error)
        }

        return resolve(stdout.split(' ')[1].trim() || stderr)
      })
    })

    const pagedjsCLIVersion = await new Promise((resolve, reject) => {
      exec(`npm view pagedjs-cli version`, (error, stdout, stderr) => {
        if (error) {
          return reject(error)
        }

        return resolve(stdout.split('\\')[0].trim() || stderr)
      })
    })

    const puppeteerVersion = await new Promise((resolve, reject) => {
      exec(`npm view puppeteer version`, (error, stdout, stderr) => {
        if (error) {
          return reject(error)
        }

        return resolve(stdout.split('\\')[0].trim() || stderr)
      })
    })

    const result = {
      alpineLinux: alpineVersion,
      node: nodeVersion,
      npm: npmVersion,
      python: pythonVersion,
      chromium: chromiumVersion,
      pagedjs: pagedjsVersion,
      'pagedjs-cli': pagedjsCLIVersion,
      puppeteer: puppeteerVersion,
    }

    return res.status(200).json(result)
  } catch (e) {
    return res.status(500).json({ msg: e.message })
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
  app.get('/info', authenticate, getToolsInfo)
}

module.exports = htmlToPDFBackend
