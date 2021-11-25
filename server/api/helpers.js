const multer = require('multer')
const path = require('path')
const fs = require('fs-extra')
const axios = require('axios')
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

const downloadImage = (url, imagePath) =>
  axios({
    url,
    responseType: 'stream',
  }).then(
    response =>
      new Promise((resolve, reject) => {
        response.data
          .pipe(fs.createWriteStream(imagePath))
          .on('finish', () => resolve())
          .on('error', e => reject(e))
      }),
  )

const objectKeyExtractor = url => {
  const stage1 = url.split('?')
  const stage2 = stage1[0].split('/')
  const objectKey = stage2[stage2.length - 1]

  return objectKey
}

const imageGatherer = book => {
  const images = []

  const $ = cheerio.load(book)

  $('img[src]').each((index, node) => {
    const $node = $(node)

    const url = $node.attr('src')
    images.push({
      url,
      objectKey: objectKeyExtractor(url),
    })
  })

  return images
}

const fixImagePaths = book => {
  const $ = cheerio.load(book)

  $('img[src]').each((index, node) => {
    const $node = $(node)

    const url = $node.attr('src')
    $node.attr('src', `./${objectKeyExtractor(url)}`)
  })

  return $.html()
}

const indexHTMLPreparation = async (
  assetsLocation,
  isPDF = false,
  onlySourceStylesheet = false,
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
    const indexContent = await readFile(`${assetsLocation}/index.html`)
    const $ = cheerio.load(indexContent)

    if (!onlySourceStylesheet) {
      $('head').append(
        `<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.13.0/katex.min.css" />`,
      )
      $('head').append(
        `<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/10.7.1/styles/default.min.css" />`,
      )
    }

    if (stylesheet) {
      $('head').append(`<link rel="stylesheet" href="${stylesheet}" />`)
    }

    if (!isPDF) {
      $('head').append(
        `<script src="https://unpkg.com/pagedjs/dist/paged.polyfill.js"/>`,
      )

      for (let i = 0; i < scriptsToInject.length; i += 1) {
        $('head').append(`<script src="${scriptsToInject[i]}"/>`)
      }
    }

    await fs.remove(`${assetsLocation}/index.html`)
    await writeFile(`${assetsLocation}/index.html`, $.html())
  } catch (e) {
    throw new Error(e)
  }
}

module.exports = {
  uploadHandler,
  removeFrameGuard,
  readFile,
  downloadImage,
  imageGatherer,
  fixImagePaths,
  writeFile,
  indexHTMLPreparation,
}
