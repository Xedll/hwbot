const TelegramBot = require('node-telegram-bot-api')
require('dotenv').config()


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
let isWaitingForUserAnsw = { "target": null, "isWaiting": false }

class Task {
   constructor(text, lesson, deadline) {
      this.text = text,
         this.creationDate = Date.now(),
         this.lesson = lesson,
         this.deadline = deadline //Сам ставится взависимости от расписания
   }
   getData() {
      return [this.text, this.lesson, this.creationDate, this.deadline]
   }
}

bot.onText(/\/add "(.*)"\s+([^\s]+)\s+(\d{4}.\d{2}.\d{2})/, async (message, match) => {
   if (homework[match[2].toLowerCase()]) {
      homework[match[2].toLowerCase()].push(new Task(match[1], match[2], '2023.12.10'))
   } else {
      homework[match[2].toLowerCase()] = [new Task(match[1], match[2], '2023.12.10')]
   }
   bot.sendMessage(message.chat.id, 'Added!')
})

// bot.onText(/Посмотреть всё дз/, async (message) => {
//    for (let lesson of Object.keys(homework)) {
//       await bot.sendMessage(message.chat.id, `Домашка по ${lesson}`)
//       for (let task of homework[lesson]) {
//          let data = task.getData()
//          await bot.sendMessage(message.chat.id, `${data[0]}.\nДо: ${data[3]}`)
//       }
//    }
// })

// bot.onText(/Дз (.+)/, async (message, match) => {
//    console.log(homework[match[1]])
//    if (homework[match[1]]) {
//       await bot.sendMessage(message.chat.id, `Домашка по ${match[1]}`)
//       for (let task of homework[match[1]]) {
//          let data = task.getData()
//          await bot.sendMessage(message.chat.id, `${data[0]}.\nДо: ${data[3]}`)
//       }
//    } else {
//       bot.sendMessage(message.chat.id, `Домашки по ${match[1]} нету`)
//    }
// })

bot.onText(/\/start/, async (message) => {
   await bot.sendMessage(message.chat.id, 'Для начала введи в какой группе по английскому ты находишься (только цифра: 1 - начальная / 2 - средняя / 3 - сильная):')
   isWaitingForUserAnsw = { target: 'english', isWaiting: true }
})


bot.on('message', async (message) => {
   if (isWaitingForUserAnsw.isWaiting && isWaitingForUserAnsw.target == 'english') {
      if (+message.text <= 3 && +message.text >= 1) {
         chats[message.chat.id] = { 'english': message.text }
         bot.sendMessage(message.chat.id, "Отлично! Приятного пользования ботом.", {
            "reply_markup": {
               'keyboard': [['Профиль'], ['Посмотреть дз'], ['Разное']]
            }
         })
         isWaitingForUserAnsw = { "target": null, "isWaiting": false }
      } else {
         bot.sendMessage(message.chat.id, "Такой группы не существует! Введите существующий номер (1 - начальная / 2 - средняя / 3 - сильная):")
      }
   }
})

bot.onText(/Посмотреть дз/, async (message) => {
   bot.sendMessage(message.chat.id, "По чему смотрим дз?", {
      reply_markup: JSON.stringify({
         'inline_keyboard': [[{ text: 'Посмотреть всё дз', callback_data: JSON.stringify({ target: 'homework', lesson: 'Всё' }) }], [{ text: 'Инфа', callback_data: JSON.stringify({ target: 'homework', lesson: 'Инфа' }) },
         { text: 'Проф. деят.', callback_data: JSON.stringify({ target: 'homework', lesson: 'Проф. Деят.' }) }, { text: 'Оп', callback_data: JSON.stringify({ target: 'homework', lesson: 'Оп' }) }],
         [{ text: 'Линейка', callback_data: JSON.stringify({ target: 'homework', lesson: 'Линейка' }) }, { text: 'Философия', callback_data: JSON.stringify({ target: 'homework', lesson: 'Философия' }) }, { text: 'Физра', callback_data: JSON.stringify({ target: 'homework', lesson: 'Физра' }) }],
         [{ text: 'Физика', callback_data: JSON.stringify({ target: 'homework', lesson: 'Физика' }) }, { text: 'История', callback_data: JSON.stringify({ target: 'homework', lesson: 'История' }) }, { text: 'Матан', callback_data: JSON.stringify({ target: 'homework', lesson: 'Матан' }) }],
         [{ text: 'Орг', callback_data: JSON.stringify({ target: 'homework', lesson: 'Орг' }) }, { text: 'Англ', callback_data: JSON.stringify({ target: 'homework', lesson: 'Англ' }) }]]
      })
   })
})


bot.on('callback_query', async (message) => {
   let data = JSON.parse(message.data)
   if (data.target != 'homework') return
   if (data.lesson == 'Всё') {
      if (Object.keys(homework).length > 0) {
         for (let lesson of Object.keys(homework)) {
            await bot.sendMessage(message.message.chat.id, `Домашка по ${lesson}`)
            for (let task of homework[lesson]) {
               let info = task.getData()
               await bot.sendMessage(message.message.chat.id, `${info[0]}.\nДо: ${info[3]}`)
               bot.answerCallbackQuery(message.id)
            }
         }
      } else {
         await bot.sendMessage(message.message.chat.id, `Дз нету!`)
         bot.answerCallbackQuery(message.id)
      }
   } else {
      if (homework[(data.lesson).toLowerCase()]) {
         await bot.sendMessage(message.message.chat.id, `Домашка по ${data.lesson}`)
         for (let task of homework[(data.lesson).toLowerCase()]) {
            let info = task.getData()
            await bot.sendMessage(message.message.chat.id, `${info[0]}.\nДо: ${info[3]}`)
            bot.answerCallbackQuery(message.id)
         }
      } else {
         await bot.sendMessage(message.message.chat.id, `Домашки по ${data.lesson} нету`)
         bot.answerCallbackQuery(message.id)
      }
   }
})