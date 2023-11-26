const getListOfLessons = require('../commands/getListOfLessons.js')
const apidata = require('../vuzapi.json')

const lessons = getListOfLessons(apidata)

module.exports = lessons