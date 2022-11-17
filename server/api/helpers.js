const multer = require('multer')
const path = require('path')
const fs = require('fs-extra')
const cheerio = require('cheerio')

const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    await fs.ensureDir('temp/')
    return cb(null, 'temp/')
  },

  // By default, multer removes file extensions so let's add them back
  filename: (req, file, cb) =>
    cb(
      null,
      `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`,
    ),
})

const fileFilter = (req, file, cb) => {
  // Accept zip only
  if (!file.originalname.match(/\.(zip)$/)) {
    req.fileValidationError = 'Only zip files are allowed!'
    return cb(null, false)
  }

  return cb(null, true)
}

const uploadHandler = multer({ storage, fileFilter }).single('zip')

const removeFrameGuard = (req, res, next) => {
  res.removeHeader('X-Frame-Options')
  next()
}

const writeFile = (location, content) =>
  new Promise((resolve, reject) => {
    fs.writeFile(location, content, 'utf8', err => {
      if (err) return reject(err)
      return resolve()
    })
  })

const readFile = location =>
  new Promise((resolve, reject) => {
    fs.readFile(location, 'utf8', (err, data) => {
      if (err) return reject(err)
      return resolve(data)
    })
  })

const findHTMLFile = async location => {
  let filename
  const projectRootFolder = path.join(__dirname, '..', '..')
  const unzippedRootFolder = path.join(projectRootFolder, location)

  return new Promise((resolve, reject) =>
    fs.readdir(unzippedRootFolder, (err, files) => {
      if (err) return reject(err)

      files.forEach(file => {
        if (path.extname(file) === '.html') {
          if (!filename) {
            filename = file
          } else {
            return reject(new Error('multiple html files inside zip'))
          }
        }

        return false
      })

      return resolve(filename)
    }),
  )
}

const indexHTMLPreparation = async (
  assetsLocation,
  isPDF = false,
  HTMLfilename = 'index.html',
) => {
  try {
    let stylesheet
    const scriptsToInject = []
    fs.readdirSync(assetsLocation).forEach(file => {
      const deconstruct = file.split('.')

      if (deconstruct[1] === 'css') {
        stylesheet = `./${file}`
      }

      if (deconstruct[1] === 'js') {
        scriptsToInject.push(`./${file}`)
      }
    })
    const indexContent = await readFile(`${assetsLocation}/${HTMLfilename}`)
    const $ = cheerio.load(indexContent)

    if (stylesheet) {
      $('head').append(`<link rel="stylesheet" href="${stylesheet}" />`)
    }

    if (!isPDF) {
      $('head').append(
        `<script src="https://unpkg.com/pagedjs@0.3.5/dist/paged.polyfill.js" />`,
      )

      for (let i = 0; i < scriptsToInject.length; i += 1) {
        $('head').append(`<script src="${scriptsToInject[i]}"/>`)
      }
    }

    await fs.remove(`${assetsLocation}/${HTMLfilename}`)
    await writeFile(
      `${assetsLocation}/${isPDF ? HTMLfilename : 'index.html'}`,
      $.html(),
    )
  } catch (e) {
    throw new Error(e)
  }
}

module.exports = {
  uploadHandler,
  removeFrameGuard,
  readFile,
  writeFile,
  indexHTMLPreparation,
  findHTMLFile,
}
