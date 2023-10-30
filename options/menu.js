const parseLessonsForOptions = require("../commands/parseLessonsForOptions")
const lessons = require("./lessons")

const menus = {
   basic: [
      ['Профиль'], ['Посмотреть дз'], ['Разное']
   ],
   admin: [
      ['Профиль'], ['Посмотреть дз'], ['Разное'], ['Admin']
   ],
   'разное': {
      basic: [['Выбрать группу по Английскому Языку'], ['Назад']],
      admin: {
         middle: [['Выбрать группу по Английскому Языку'], ['Добавить домашнее задание'], ['Назад'], ['Мидл']],
         junior: [['Выбрать группу по Английскому Языку'], ['Добавить домашнее задание'], ['Назад'], ['Джун']]
      }
   },
   homework: {
      admin: {
         middle: [...parseLessonsForOptions(lessons, 1, 'add')],
         junior: [...parseLessonsForOptions(lessons, 1, 'add', ['Иностранный язык'])]
      }
   }
}

module.exports = menus