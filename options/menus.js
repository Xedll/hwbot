const parseLessonsForOptions = require("../commands/parseLessonsForOptions")
const lessons = require("./lessons")

const menus = {
   basic: [['Профиль'], ['Посмотреть дз'], ['Разное']],
   'разное': {
      basic: [['Выбрать группу по Английскому Языку'], ['Назад']],
      middle: [['Выбрать группу по Английскому Языку'], ['Работа с домашним заданием'], ['Назад']],
      junior: [['Выбрать группу по Английскому Языку'], ['Работа с домашним заданием'], ['Назад']],
      senjor: [['Выбрать группу по Английскому Языку'], ['Работа с домашним заданием'], ['Действия с админами'], ['Назад']]
   },
   'Работа с домашним заданием': {
      basic: [["Изменить домашнее задание"], ["Добавить домашнее задание"], ["Удалить домашнее задание"], ['Назад']]
   },
   homework: {
      senjor: {
         add: [...parseLessonsForOptions(Object.keys(lessons), 1, 'addHomeworkType')],
         edit: [...parseLessonsForOptions(Object.keys(lessons), 1, 'edit')],
      },
      middle: {
         add: [...parseLessonsForOptions(Object.keys(lessons), 1, 'addHomeworkType')],
         edit: [...parseLessonsForOptions(Object.keys(lessons), 1, 'edit')],
      },
      junior: {
         add: [...parseLessonsForOptions(Object.keys(lessons), 1, 'addHomeworkType', ['Иностранный язык'])],
         edit: [...parseLessonsForOptions(Object.keys(lessons), 1, 'edit', ['Иностранный язык'])]
      }
   },
   permissions: {
      senjor: lessons,
      middle: lessons,
      junior: { 'Иностранный язык': lessons['Иностранный язык'] },
      basic: [],
   },
   'Действия с админами': [['Изменить права юзеру']]
}

module.exports = menus