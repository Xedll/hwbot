//Libs
const TelegramBot = require('node-telegram-bot-api')
require('dotenv').config()

// const axios = require('axios').default;
// axios.post('https://kai.ru/raspisanie?p_p_id=pubStudentSchedule_WAR_publicStudentSchedule10&p_p_lifecycle=2&p_p_resource_id=schedule', { groupId: '25212' },
//    { headers: { 'content-type': 'application/x-www-form-urlencoded' } }
// )


//Functions
const buildHomeworkMessage = require('./commands/buildHomeworkMessage.js')
const parseLessonsForOptions = require('./commands/parseLessonsForOptions.js')
const { parse } = require('dotenv')

//Options
const menus = require('./options/menu.js')
const lessons = require('./options/lessons.js')
const homework = {}
const chats = {}
const admins = {
   senjor: [],
   middle: [],
   junior: [1386879737],
   //эльза: 1983335577, я:1386879737
}
let isWaitingForUserAnsw = { "target": null, "isWaiting": false }
let tempTask = {}

class Task {
   constructor(text, lesson, deadline, creator) {
      this.text = text;
      this.lesson = lesson;
      this.deadline = deadline || 0; //Сам ставится взависимости от расписания
      this.creator = creator;
      this.creationDate = Date.now();
   }
}


//ENV
const BOT_TOKEN = process.env.api_key_bot
const ADMIN_PASSWORD = process.send.admin_password


const bot = new TelegramBot(BOT_TOKEN, {
   polling: true
});

bot.on('polling_error', (err) => {
   console.log(err.message)
})

bot.onText(/\/start/, async (message) => {
   if (!(message.chat.id in chats)) {
      let isAdmin = ''
      Object.keys(admins).forEach(IterPermission => {
         admins[IterPermission].forEach(item => {
            if (item == message.chat.id) {
               isAdmin = IterPermission
            }
         })
      })
      if (isAdmin == 'senior') {
         chats[message.chat.id] = { permissions: 'senior', class: 'admin' }
      } else if (isAdmin == 'middle') {
         chats[message.chat.id] = { permissions: 'middle', class: 'admin' }
      } else if (isAdmin == 'junior') {
         chats[message.chat.id] = { permissions: 'junior', class: 'admin' }
      } else {
         chats[message.chat.id] = { permissions: 'basic', class: 'basic' }
      }
      await bot.sendMessage(message.chat.id, 'Сюда в общем то что может бот делать напиши', {
         reply_markup: {
            keyboard: menus[chats[message.chat.id].class]
         }
      })
   } else {
      await bot.sendMessage(message.chat.id, 'Что делаем?', {
         reply_markup: {
            keyboard: menus[chats[message.chat.id].class]
         }
      })
   }
})

bot.onText(/Разное/, async (message) => {
   if (!(message.chat.id in chats)) return
   await bot.sendMessage(message.chat.id, 'Что делаем?', {
      reply_markup: {
         keyboard: chats[message.chat.id].class == 'basic' ? menus['разное'][chats[message.chat.id].class] : menus['разное'][chats[message.chat.id].class][chats[message.chat.id].permissions],
      }
   })

})

bot.onText(/Посмотреть дз/, async (message) => {
   if (!(message.chat.id in chats)) return
   await bot.sendMessage(message.chat.id, "По чему смотрим дз?", {
      reply_markup: JSON.stringify({
         inline_keyboard: [[{ text: 'Дз по всем дисциплинам', callback_data: JSON.stringify({ target: 'homework', lesson: 'Всё' }) }], ...parseLessonsForOptions(lessons, 2, 'homework')]
      })
   })

})

bot.onText(/Выбрать группу по Английскому Языку/, async (message) => {
   if (!(message.chat.id in chats)) return
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
   if (!(message.chat.id in chats)) return
   await bot.sendMessage(message.chat.id, 'Что делаем?', {
      reply_markup: {
         keyboard: menus[chats[message.chat.id].class]
      }
   })
   isWaitingForUserAnsw = { "target": null, "isWaiting": false }
})

bot.onText(/Добавить домашнее задание/, async (message) => {
   if (!(message.chat.id in chats)) return
   if (chats[message.chat.id].class == 'basic') return
   await bot.sendMessage(message.chat.id, 'По какой дисциплине добавляем дз?', {
      reply_markup: JSON.stringify({
         inline_keyboard: menus.homework[chats[message.chat.id].class][chats[message.chat.id].permissions]
      })
   })
   isWaitingForUserAnsw = { target: 'addHomeworkText', isWaiting: true }

})

bot.on('message', async (message) => {

   if (!(message.chat.id in chats) && (message.text != '/start')) {
      await bot.sendMessage(message.chat.id, 'Пожалуйста, пропишите /start для началы пользования ботом.', {
         reply_markup: JSON.stringify({
            remove_keyboard: true
         })
      });
      return
   }

   if (isWaitingForUserAnsw.target == 'addHomeworkText' && (message.text != 'Назад')) {
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
         homework[tempTask.lesson].push(new Task(tempTask.text, tempTask.lesson, tempTask.deadline, message.from.id))
      } else {
         homework[tempTask.lesson] = [new Task(tempTask.text, tempTask.lesson, tempTask.deadline, message.from.id)]
      }
      await bot.sendMessage(message.chat.id, 'Домашка добавлена!', {
         reply_markup: {
            keyboard: menus[chats[message.chat.id].permissions]
         }
      })
      isWaitingForUserAnsw = { "target": null, "isWaiting": false }
      tempTask = {}
   }
})

bot.on('callback_query', async (message) => {
   let chatID = message.message.chat.id

   if (!(chatID in chats)) {
      await bot.sendMessage(chatID, 'Пожалуйста, пропишите /start для началы пользования ботом.', {
         reply_markup: JSON.stringify({
            remove_keyboard: true
         })
      });
      bot.answerCallbackQuery(message.id)
      return
   }

   let data = JSON.parse(message.data)
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
      chats[data.chatID] = { ...chats[data.chatID], english: data.group }
      await bot.sendMessage(data.chatID, "Отлично! Приятного пользования ботом.", {
         "reply_markup": {
            'keyboard': [['Профиль'], ['Посмотреть дз'], ['Разное']]
         }
      })
      bot.answerCallbackQuery(message.id)
   }
   if (data.target == 'add') {
      if (chats[chatID].class == 'basic') return
      let lessonID = data.lesson
      tempTask.lesson = lessons[lessonID]
      await bot.sendMessage(chatID, `Что задали по дисциплине "${lessons[lessonID]}"?`)
      bot.answerCallbackQuery(message.id)
   }
   if (data.target == 'addDeadline') {
      if (chats[chatID].class == 'basic') return
      if (data.data == 'yes') {
         isWaitingForUserAnsw = { target: 'addDeadline', isWaiting: true }
         await bot.sendMessage(chatID, 'Какой дедлайн у домашки?')
         bot.answerCallbackQuery(message.id)
      } else {
         if (homework[tempTask.lesson]) {
            homework[tempTask.lesson].push(new Task(tempTask.text, tempTask.lesson, tempTask.deadline, message.from.id))
         } else {
            homework[tempTask.lesson] = [new Task(tempTask.text, tempTask.lesson, tempTask.deadline, message.from.id)]
         }
         await bot.sendMessage(chatID, 'Домашка добавлена!', {
            reply_markup: {
               keyboard: menus[chats[chatID].class]
            }
         })
         isWaitingForUserAnsw = { "target": null, "isWaiting": false }
         tempTask = {}
         bot.answerCallbackQuery(message.id)
      }
   }

})