const TelegramBot = require('node-telegram-bot-api')
require('dotenv').config()

// const axios = require('axios').default;
// axios.post('https://kai.ru/raspisanie?p_p_id=pubStudentSchedule_WAR_publicStudentSchedule10&p_p_lifecycle=2&p_p_resource_id=schedule', { groupId: '25212' },
//    { headers: { 'content-type': 'application/x-www-form-urlencoded' } }
// )

const buildHomeworkMessage = require('./commands/buildHomeworkMessage.js')
const getListOfLessons = require('./commands/getListOfLessons.js')
const parseLessonsForOptions = require('./commands/parseLessonsForOptions.js')


const BOT_TOKEN = process.env.api_key_bot
const ADMIN_PASSWORD = process.send.admin_password


const bot = new TelegramBot(BOT_TOKEN, {
   polling: true
});


bot.on('polling_error', (err) => {
   console.log(err.message)
})


const homework = {}
const chats = {}
const lessons = [
   'Информатика и основы информационных технологий',
   'Введение в профессиональную деятельность ',
   'Основы программирования',
   'Линейная алгебра и аналитическая геометрия',
   'Философия',
   'Физическая культура и спорт (элективная)',
   'Физика',
   'История России',
   'Математический анализ',
   'Основы российской государственности',
   'Иностранный язык',
   'Физическая культура и спорт'
]
const menus = {
   basic: [
      ['Профиль'], ['Посмотреть дз'], ['Разное']
   ],
   'разное': {
      basic: [['Выбрать группу по Английскому Языку'], ['Назад']],
      admin: [['Выбрать группу по Английскому Языку'], ['Добавить домашнее задание'], ['Назад']]
   }

}


let isWaitingForUserAnsw = { "target": null, "isWaiting": false }

let tempTask = {}

class Task {
   constructor(text, lesson, deadline) {
      this.text = text,
         this.creationDate = Date.now(),
         this.lesson = lesson,
         this.deadline = deadline || 0 //Сам ставится взависимости от расписания
   }
}

bot.onText(/\/start/, async (message) => {
   if (!(message.chat.id in chats)) {
      chats[message.chat.id] = { permission: 'basic' }
      await bot.sendMessage(message.chat.id, 'Сюда в общем то что может бот делать напиши', {
         reply_markup: {
            keyboard: menus.basic
         }
      })
   } else {
      await bot.sendMessage(message.chat.id, 'Что делаем?', {
         reply_markup: {
            keyboard: menus.basic
         }
      })
   }
})

bot.onText(/Разное/, async (message) => {
   bot.sendMessage(message.chat.id, 'Что делаем?', {
      reply_markup: {
         keyboard: menus['разное'].admin,
      }

   })
})

bot.onText(/Посмотреть дз/, async (message) => {
   bot.sendMessage(message.chat.id, "По чему смотрим дз?", {
      reply_markup: JSON.stringify({
         inline_keyboard: [[{ text: 'Дз по всем дисциплинам', callback_data: JSON.stringify({ target: 'homework', lesson: 'Всё' }) }], ...parseLessonsForOptions(lessons, 2, 'homework')]
      })
   })
})
bot.onText(/Выбрать группу по Английскому Языку/, async (message) => {
   await bot.sendMessage(message.chat.id, 'Для начала введи в какой группе по английскому ты находишься (1 - начальная / 2 - средняя / 3 - сильная):', {
      reply_markup: JSON.stringify({
         'inline_keyboard': [[{ text: '1-я', callback_data: JSON.stringify({ target: 'english', group: '1', chatID: message.chat.id }) }],
         [{ text: '2-я', callback_data: JSON.stringify({ target: 'english', group: '2', chatID: message.chat.id }) }],
         [{ text: '3-я', callback_data: JSON.stringify({ target: 'english', group: '3', chatID: message.chat.id }) }]
         ]
      })
   })
})

bot.onText(/Назад/, async (message) => {
   await bot.sendMessage(message.chat.id, 'Что делаем?', {
      reply_markup: {
         keyboard: menus.basic
      }
   })
   isWaitingForUserAnsw = { "target": null, "isWaiting": false }
})

bot.onText(/Добавить домашнее задание/, async (message) => {
   await bot.sendMessage(message.chat.id, 'По какому предмету добавляем дз?', {
      reply_markup: JSON.stringify({
         inline_keyboard: parseLessonsForOptions(lessons, 1, "add")
      })
   })
   isWaitingForUserAnsw = { target: 'addHomeworkText', isWaiting: true }
})

bot.on('message', async (message) => {
   if (!isWaitingForUserAnsw.isWaiting) return

   if (isWaitingForUserAnsw.target == 'addHomeworkText') {
      tempTask.text = message.text
      await bot.sendMessage(message.chat.id, 'Добавим дедлайн?', {
         reply_markup: JSON.stringify({
            inline_keyboard: [[{ text: 'Да', callback_data: JSON.stringify({ target: 'addDeadline', data: 'yes' }) }, { text: 'Нет', callback_data: JSON.stringify({ target: 'addDeadline', data: 'no' }) }]]
         })
      })
   }
   if (isWaitingForUserAnsw.target == 'addDeadline') {
      tempTask.deadline = message.text
      if (homework[tempTask.lesson]) {
         homework[tempTask.lesson].push(new Task(tempTask.text, tempTask.lesson, tempTask.deadline))
      } else {
         homework[tempTask.lesson] = [new Task(tempTask.text, tempTask.lesson, tempTask.deadline)]
      }
      await bot.sendMessage(message.chat.id, 'Домашка добавлена!', {
         reply_markup: {
            keyboard: menus.basic
         }
      })
      isWaitingForUserAnsw = { "target": null, "isWaiting": false }
      tempTask = {}
   }
})

bot.on('callback_query', async (message) => {
   let data = JSON.parse(message.data)
   let chatID = message.message.chat.id
   if (data.target == 'homework') {
      if (data.lesson == 'Всё') {
         if (Object.keys(homework).length > 0) {
            for (let lesson of Object.keys(homework)) {
               await bot.sendMessage(chatID, buildHomeworkMessage(homework[lesson], lesson))
            }
         } else {
            await bot.sendMessage(chatID, `Дз нету!`)
         }
         bot.answerCallbackQuery(message.id)
      } else {
         if (homework[lessons[data.lesson]]) {
            await bot.sendMessage(chatID, buildHomeworkMessage(homework[lessons[data.lesson]], lessons[data.lesson]))
         } else {
            await bot.sendMessage(chatID, `Дз по дисциплине "${lessons[data.lesson]}" нет`)
         }
         bot.answerCallbackQuery(message.id)
      }
   }
   if (data.target == 'english') {
      chats[data.chatID] = { english: data.group, permission: 'basic' }
      await bot.sendMessage(data.chatID, "Отлично! Приятного пользования ботом.", {
         "reply_markup": {
            'keyboard': [['Профиль'], ['Посмотреть дз'], ['Разное']]
         }
      })
      bot.answerCallbackQuery(message.id)
   }
   if (data.target == 'add') {
      let lessonID = data.lesson
      tempTask.lesson = lessons[lessonID]
      await bot.sendMessage(chatID, `Что задали по ${lessons[lessonID]}?`)
      bot.answerCallbackQuery(message.id)
   }
   if (data.target == 'addDeadline') {
      if (data.data == 'yes') {
         isWaitingForUserAnsw = { "target": 'addDeadline', "isWaiting": true }
         await bot.sendMessage(chatID, 'Какой дедлайн у домашки?')
         bot.answerCallbackQuery(message.id)
      } else {
         if (homework[tempTask.lesson]) {
            homework[tempTask.lesson].push(new Task(tempTask.text, tempTask.lesson, tempTask.deadline))
         } else {
            homework[tempTask.lesson] = [new Task(tempTask.text, tempTask.lesson, tempTask.deadline)]
         }
         await bot.sendMessage(chatID, 'Домашка добавлена!', {
            reply_markup: {
               keyboard: menus.basic
            }
         })
         isWaitingForUserAnsw = { "target": null, "isWaiting": false }
         tempTask = {}
         bot.answerCallbackQuery(message.id)
      }
   }
})