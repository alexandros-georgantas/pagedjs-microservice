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
  // Accept EPUBs only
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
module.exports = {
  uploadHandler,
  removeFrameGuard,
  readFile,
  downloadImage,
  imageGatherer,
  fixImagePaths,
  writeFile,
}
