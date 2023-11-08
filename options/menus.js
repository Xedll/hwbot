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
         middle: [['Выбрать группу по Английскому Языку'], ['Работа с домашним заданием'], ['Назад'], ['Мидл']],
         junior: [['Выбрать группу по Английскому Языку'], ['Работа с домашним заданием'], ['Назад'], ['Джун']]
      }
   },
   'Работа с домашним заданием': {
      basic: [["Изменить домашнее задание"], ["Добавить домашнее задание"], ["Удалить домашнее задание"], ['Назад']]
   },
   homework: {
      admin: {
         add: {
            middle: [...parseLessonsForOptions(lessons, 1, 'add')],
            junior: [...parseLessonsForOptions(lessons, 1, 'add', ['Иностранный язык'])]
         },
         edit: {
            middle: [...parseLessonsForOptions(lessons, 1, 'edit')],
            junior: [...parseLessonsForOptions(lessons, 1, 'edit', ['Иностранный язык'])]
         }
      }
   },
   permissions: {
      senjor: lessons,
      middle: lessons,
      junior: ['Иностранный язык'],
      basic: [],
   }
}

module.exports = menus