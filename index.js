//Libs
const sqlite3 = require('sqlite3');
const TelegramBot = require('node-telegram-bot-api')
require('dotenv').config()
const { parse } = require('dotenv')
const express = require('express')

const server = express()
server.listen(3000, () => {
   console.log('Server is listening on port 3000')
})
server.get('/', (req, res) => {
   res.send(200)
})



// const axios =require('axios').default;
// axios.post('https://kai.ru/raspisanie?p_p_id=pubStudentSchedule_WAR_publicStudentSchedule10&p_p_lifecycle=2&p_p_resource_id=schedule', { groupId: '25212' },
//    { headers: { 'content-type': 'application/x-www-form-urlencoded' } }
// ).then(data => fs.writeFile('./vuzapi.json', JSON.stringify(data.data), (err) => { console.log(err) }))



//Functions
const buildHomeworkMessage = require('./commands/buildHomeworkMessage.js')
const parseLessonsForOptions = require('./commands/parseLessonsForOptions.js') //Передаётся список предметов
const getParsedHomework = require('./commands/getParsedHomework.js')
const parseLessonsForDays = require('./commands/parseLessonsForDays.js'); //Передаётся "сырая" дата апи вуза
const getListOfLessons = require('./commands/getListOfLessons.js'); //Передаётся "сырая" дата апи вуза
const getHomeworkForTomorrow = require('./commands/getHomeworkForTomorrow.js');

//Options
const commands = require('./options/commands.js')
const menus = require('./options/menus.js')
const lessons = require('./options/lessons.js');
const APIData = require('./vuzapi.json')
const setDeadline = require('./commands/setDeadline.js')
const getEvennessOfWeek = require('./commands/getEvennessOfWeek.js')


let homework = {}
let chats = {}
let admins = {
   senjor: [],
   middle: [1386879737],
   junior: [968717848,],
   //эльза: 1983335577, я:1386879737, паша: 968717848
}

const db = new sqlite3.Database('./db/homework.db', sqlite3.OPEN_READWRITE, (err) => {
   if (err) console.error(err)
})



let isWaitingForUserAnsw = { "target": null, "isWaiting": false }
let tempTask = {}


class Task {
   constructor(text, lesson, deadline, creator, type, group) {
      this.text = text;
      this.lesson = lesson;
      this.deadline = deadline || 0;
      this.creator = creator;
      this.creationDate = Date.now();
      this.type = type;
      this.group = group || 5;
   }
}



const resetUserInput = () => {
   isWaitingForUserAnsw = { "target": null, "isWaiting": false }
}
const resetTempTask = () => {
   tempTask = {}
}

//DB functions
const setUsersFromDB = (data) => {
   if (data <= 0) return {}
   for (let i of data) {
      chats[i.student_id] = { ...i }
   }
}
const getUsersFromDB = async () => {

   await db.all('SELECT * FROM student JOIN permission ON student.student_permission=permission.permission_id', [], async (err, rows) => {
      if (err) return console.error(err.message)
      await setUsersFromDB(rows)
   })

}

const setHomeworkFromDB = (data) => {
   if (data <= 0) return {}
   homework = getParsedHomework(data)
}
const getHomeworkFromDB = async () => {
   await db.all('SELECT * FROM homework', [], async (err, rows) => {
      if (err) return console.error(err.message)
      await setHomeworkFromDB(rows)
   })
}

//ENV
const BOT_TOKEN = process.env.api_key_bot || '0'
//const ADMIN_PASSWORD = process.send.admin_password


const bot = new TelegramBot(BOT_TOKEN, {
   polling: true
});

bot.on('polling_error', (err) => {
   console.error(err.message)
})

//!!Starting setup

getUsersFromDB();
getHomeworkFromDB();

//!!

//!!TIMER

setInterval(async () => { //!!Прок на каждые 5 минут
   if (new Date().getUTCHours() + 3 == 14 && (new Date().getMinutes() + 1 >= 0 || new Date().getMinutes() + 1 <= 5)) {
      await getUsersFromDB()
      await getHomeworkFromDB()
      await new Promise((resolve) => setTimeout(resolve, 250));
      if (getHomeworkForTomorrow(homework)) {
         for (let chat of Object.keys(chats)) {
            let homeworkForTomorrow = getHomeworkForTomorrow(homework)
            for (let lesson of Object.keys(homeworkForTomorrow)) {
               await bot.sendMessage(chat, '#завтра\nДомашка на завтра:')
               await bot.sendMessage(chat, buildHomeworkMessage(homeworkForTomorrow[lesson], lesson, chat), { parse_mode: 'HTML' })
            }
         }
      }
   }

}, 300_000)

bot.onText(/\/start/, async (message) => {
   await getUsersFromDB()
   await new Promise((resolve) => setTimeout(resolve, 250));
   if (!(message.chat.id in chats)) {
      let tempUser = { permissions: 1 }
      let isAdmin = ''
      Object.keys(admins).forEach(IterPermission => {
         admins[IterPermission].forEach(item => {
            if (item == message.chat.id) {
               isAdmin = IterPermission
            }
         })
      })
      if (isAdmin == 'senior') {
         tempUser.permissions = 4
      } else if (isAdmin == 'middle') {
         tempUser.permissions = 3
      } else if (isAdmin == 'junior') {
         tempUser.permissions = 2
      }

      db.run('INSERT INTO student(student_id,student_nickname,student_permission,student_english) VALUES (?,?,?,?)', [message.from.id, message.from.username, tempUser.permissions, 0])

      await bot.sendMessage(message.chat.id, 'Сюда в общем то что может бот делать напиши', {
         reply_markup: {
            keyboard: menus.basic
         }
      })
   } else {
      let userPermission = ''
      for (let permission of Object.keys(admins)) {
         if (admins[permission].includes(message.chat.id)) {
            userPermission = permission
         }
      }
      console.log(userPermission, chats[message.chat.id].permission_title)
      if (chats[message.chat.id].permission_title != userPermission && userPermission) {
         await db.run('UPDATE student SET student_permission = (SELECT permission_id FROM permission WHERE permission_title=?) WHERE student_id = ?', [userPermission, message.chat.id], (err) => {
            if (err) return console.error(err.message)
         })
      }

      await bot.sendMessage(message.chat.id, 'Что делаем?', {
         reply_markup: {
            keyboard: menus.basic
         }
      })
   }
})

bot.onText(/Разное/, async (message) => {
   if (!(message.chat.id in chats)) return
   await bot.sendMessage(message.chat.id, 'Что делаем?', {
      reply_markup: {
         keyboard: menus['разное'][chats[message.chat.id].permission_title]
      }
   })

})
bot.onText(/Работа с домашним заданием/, async (message) => {
   if (!(message.chat.id in chats)) return
   await bot.sendMessage(message.chat.id, 'Что делаем?', {
      reply_markup: {
         keyboard: menus['Работа с домашним заданием'].basic,
      }
   })

})

bot.onText(/Посмотреть дз/, async (message) => {
   if (!(message.chat.id in chats)) return
   await bot.sendMessage(message.chat.id, "По чему смотрим дз?", {
      reply_markup: JSON.stringify({
         inline_keyboard: [[{ text: 'Дз на завтра', callback_data: JSON.stringify({ target: 'homework', lesson: 'Завтра' }) }], [{ text: 'Дз по всем дисциплинам', callback_data: JSON.stringify({ target: 'homework', lesson: 'Всё' }) }], ...parseLessonsForOptions(Object.keys(lessons), 2, 'homework')]
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
         keyboard: menus.basic
      }
   })
   resetUserInput()
})

bot.onText(/Добавить домашнее задание/, async (message) => {
   await getUsersFromDB()
   await new Promise((resolve) => setTimeout(resolve, 250));
   if (!(message.chat.id in chats)) return
   if (chats[message.chat.id].permission_title == 'basic') return
   isWaitingForUserAnsw = { target: 'addHomeworkType', isWaiting: true }
   await bot.sendMessage(message.chat.id, 'По какой дисциплине добавляем дз?', {
      reply_markup: {
         inline_keyboard: menus.homework[chats[message.chat.id].permission_title].add
      }
   })

})

bot.onText(/Изменить домашнее задание/, async (message) => {
   if (!(message.chat.id in chats)) return
   if (chats[message.chat.id].permission_title == 'basic') return
   await bot.sendMessage(message.chat.id, 'Введи айди дз, которое Вы хотите изменить.')
   isWaitingForUserAnsw = { target: 'editHomework', isWaiting: true }
})

bot.onText(/Удалить домашнее задание/, async (message) => {
   if (!(message.chat.id in chats)) return
   if (chats[message.chat.id].permission_title == 'basic') return
   await bot.sendMessage(message.chat.id, 'Введи айди дз, которое Вы хотите удалить.')
   isWaitingForUserAnsw = { target: 'deleteHomework', isWaiting: true }
})

bot.on('message', async (message) => {
   if (!(message.chat.id in chats) && (message.text != '/start')) {
      await bot.sendMessage(message.chat.id, 'Пожалуйста, пропишите /start для началы пользования ботом.', {
         reply_markup: {
            remove_keyboard: true
         }
      });
      return
   }
   if (commands.includes(message.text)) return

   if (isWaitingForUserAnsw.target == 'addHomeworkText' && (message.text != 'Назад')) {
      tempTask.text = message.text
      await bot.sendMessage(message.chat.id, 'Добавим дедлайн?', {
         reply_markup: {
            inline_keyboard: [[{ text: 'Да', callback_data: JSON.stringify({ target: 'addDeadline', data: 'yes' }) }, { text: 'Нет', callback_data: JSON.stringify({ target: 'addDeadline', data: 'no' }) }]]
         }
      })
   }

   if (isWaitingForUserAnsw.target == 'addDeadline') {
      try {
         let tempDeadline = message.text.match(/(\d{2})\.(\d{2})\.(\d{4})/)
         tempTask.deadline = new Date((tempDeadline[1] - 1) * 86_400_000 + (tempDeadline[2] - 1) * 2_629_746_000 + (tempDeadline[3] - 1970) * 31_556_952_000)
         let taskForAdd = new Task(tempTask.text, tempTask.lesson, tempTask.deadline, message.chat.id, tempTask.type)
         db.run('INSERT INTO homework(homework_text,homework_lesson,homework_deadline,homework_creator,homework_type,homework_english_group) VALUES (?,?,?,?,?,?)', [taskForAdd.text, taskForAdd.lesson, taskForAdd.deadline, taskForAdd.creator, taskForAdd.type, 0], (err) => {
            if (err) return console.error(err)
         })
         await bot.sendMessage(message.chat.id, 'Домашка добавлена!', {
            reply_markup: {
               keyboard: menus.basic
            }
         })
         resetUserInput()
         resetTempTask()
      } catch (error) {
         await bot.sendMessage(message.chat.id, 'Дедлайн введен неверно. Проверьте правильность написания дедлайна. Формат: дд.мм.гггг, между данными ставится точка.')
      }
   }
   if (isWaitingForUserAnsw.target == 'editHomework') {
      await bot.sendMessage(message.chat.id, 'Что меняем у дз?', {
         reply_markup: {
            inline_keyboard: [[{ text: 'Текст', callback_data: JSON.stringify({ target: 'editTextForHomework', taskID: message.text }) }], [{ text: 'Дедлайн', callback_data: JSON.stringify({ target: 'editDeadlineForHomework', taskID: message.text }) }]]
         }
      })
   }
   if (isWaitingForUserAnsw.target == 'rewriteNewText') {
      isWaitingForUserAnsw.taskForEdit.homework_text = message.text
      db.run('UPDATE homework SET homework_text=? WHERE homework_id=?', [message.text, isWaitingForUserAnsw.taskForEdit.homework_id])
      await bot.sendMessage(message.chat.id, 'Дз успешно изменено.', {
         reply_markup: {
            keyboard: menus.basic
         }
      })
      resetUserInput()
      await getHomeworkFromDB()
      await new Promise((resolve) => setTimeout(resolve, 250));
   }
   if (isWaitingForUserAnsw.target == 'rewriteNewDeadline') {
      try {
         let tempDeadline = message.text.match(/(\d{2})\.(\d{2})\.(\d{4})/)
         isWaitingForUserAnsw.taskForEdit.homework_deadline = new Date((+tempDeadline[1] - 1) * 86_400_000 + (+tempDeadline[2] - 1) * 2_629_746_000 + (+tempDeadline[3] - 1970) * 31_556_952_000)
         db.run('UPDATE homework SET homework_deadline=? WHERE homework_id=?', [isWaitingForUserAnsw.taskForEdit.homework_deadline, isWaitingForUserAnsw.taskForEdit.homework_id])
         await bot.sendMessage(message.chat.id, 'Дз успешно изменено.', {
            reply_markup: {
               keyboard: menus.basic
            }
         })
         resetUserInput()
         await getHomeworkFromDB()
      } catch (error) {
         await bot.sendMessage(message.chat.id, 'Дедлайн введен неверно. Проверьте правильность написания дедлайна. Формат: дд.мм.гггг, между данными ставится точка.')
      }


   }
   if (isWaitingForUserAnsw.target == 'deleteHomework') {
      await getHomeworkFromDB()
      await new Promise((resolve) => setTimeout(resolve, 250));

      let homeworkLessons = Object.keys(homework)
      let isHomeworkHaveFound = false
      homeworkLessons.forEach(lesson => {
         for (let i = 0; i < homework[lesson].length; i++) {
            if (homework[lesson][i].homework_id == message.text) return isHomeworkHaveFound = true
         }
      })

      if (isHomeworkHaveFound) {
         db.run('DELETE FROM homework WHERE homework_id = ?', [message.text], (err) => {
            if (err) return console.error(err.message)
         })
         await bot.sendMessage(message.chat.id, 'Дз успешно удалено.', {
            reply_markup: {
               keyboard: menus.basic
            }
         })
         await getHomeworkFromDB()
         await new Promise((resolve) => setTimeout(resolve, 250));
         resetUserInput()
      } else {
         await bot.sendMessage(message.chat.id, 'Дз не было найдено.', {
            reply_markup: {
               keyboard: menus.basic
            }
         })
         resetUserInput()
      }

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
      await getHomeworkFromDB()
      await getUsersFromDB()
      await new Promise((resolve) => setTimeout(resolve, 250));
      if (data.lesson == 'Всё') {
         if (Object.keys(homework).length > 0) {
            for (let lesson of Object.keys(homework)) {
               await bot.sendMessage(chatID, buildHomeworkMessage(homework[lesson], lesson, chatID), { parse_mode: 'HTML' })
            }
         } else {
            await bot.sendMessage(chatID, `Дз нету!`)
         }
         bot.answerCallbackQuery(message.id)
      } else if (data.lesson == 'Завтра') {
         let homeworkForTomorrow = getHomeworkForTomorrow(homework)
         if (Object.keys(homeworkForTomorrow).length > 0) {
            for (let lesson of Object.keys(homeworkForTomorrow)) {
               await bot.sendMessage(chatID, buildHomeworkMessage(homework[lesson], lesson, chatID), { parse_mode: 'HTML' })
            }
         } else {
            await bot.sendMessage(chatID, `Дз на завтра отсутствует.`)
         }
         bot.answerCallbackQuery(message.id)
      } else {
         if (homework[Object.keys(lessons)[data.lesson]]) {
            await bot.sendMessage(chatID, buildHomeworkMessage(homework[Object.keys(lessons)[data.lesson]], Object.keys(lessons)[data.lesson], chatID), { parse_mode: 'HTML' })
         } else {
            await bot.sendMessage(chatID, `Дз по дисциплине "${Object.keys(lessons)[data.lesson]}" нет`)
         }
         bot.answerCallbackQuery(message.id)
      }
   }
   if (data.target == 'english') {
      db.run('UPDATE student SET student_english = ? WHERE student_id = ?', [data.group, data.chatID], (err) => {
         if (err) return console.error(err.message)
      })
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

      if (isWaitingForUserAnsw.target == null) {
         isWaitingForUserAnsw = { target: 'addHomeworkType', isWaiting: true }
      }

      if (!tempTask.lesson) {
         let lessonID = data.lesson
         tempTask.lesson = Object.keys(lessons)[lessonID]
      }

      if (Object.keys(lessons).indexOf(tempTask.lesson) != data.lesson && !data.isSettedType) {
         resetTempTask()
         let lessonID = data.lesson
         tempTask.lesson = Object.keys(lessons)[lessonID]
         isWaitingForUserAnsw = { target: 'addHomeworkType', isWaiting: true }
         console.log(tempTask, isWaitingForUserAnsw)
      }

      if (isWaitingForUserAnsw.target == 'addHomeworkText') {
         await bot.sendMessage(chatID, `Что задали по дисциплине "${tempTask.lesson}"?`)
         bot.answerCallbackQuery(message.id)
         tempTask.type = lessons[tempTask.lesson][data.lesson]

      } else if (isWaitingForUserAnsw.target == 'addHomeworkType') {

         await bot.sendMessage(chatID, `Добавление дз для какого "типа" дисциплины "${tempTask.lesson}"?`, {
            reply_markup: JSON.stringify({
               inline_keyboard: parseLessonsForOptions(lessons[tempTask.lesson], 1, 'add', [], { isSettedType: true })
            })
         })
         bot.answerCallbackQuery(message.id)
         isWaitingForUserAnsw = { target: 'addHomeworkText', isWaiting: true }
         tempTask.type = lessons[tempTask.lesson][data.lesson]
      }
   }
   if (data.target == 'addDeadline') {
      if (chats[chatID].class == 'basic') return
      if (data.data == 'yes') {
         isWaitingForUserAnsw = { target: 'addDeadline', isWaiting: true }
         await bot.sendMessage(chatID, 'Какой дедлайн у домашки? (Ответ требует формата дд.мм.гггг, например 01.01.1970. Обратите внимание на кол-во дней в месяце, чтобы домашка установилась правильно)')
         bot.answerCallbackQuery(message.id)
      } else {
         let taskForAdd = new Task(tempTask.text, tempTask.lesson, tempTask.deadline, message.from.id, tempTask.type)
         setDeadline(parseLessonsForDays(APIData), taskForAdd, getEvennessOfWeek())

         db.run('INSERT INTO homework(homework_text,homework_lesson,homework_deadline,homework_creator,homework_type,homework_english_group) VALUES (?,?,?,?,?,?)', [taskForAdd.text, taskForAdd.lesson, taskForAdd.deadline, taskForAdd.creator, taskForAdd.type, 0], (err) => {
            if (err) return console.error(err)
         })

         await bot.sendMessage(chatID, 'Домашка добавлена!', {
            reply_markup: {
               keyboard: menus[chats[chatID].permission_title]
            }
         })

         resetUserInput()
         resetTempTask()
         bot.answerCallbackQuery(message.id)
      }
   }
   if (data.target == 'editTextForHomework') {
      if (chats[chatID].class == 'basic') return
      let taskForEdit = null
      await getHomeworkFromDB()
      await new Promise((resolve) => setTimeout(resolve, 250));
      for (let key of Object.keys(homework)) {
         homework[key].forEach(async item => {
            if (item.homework_id == data.taskID) {
               if (item.homework_lesson in menus.permissions[chats[chatID].permission_title] && item.homework_creator == chatID) {
                  taskForEdit = item
               }
            }
         })
      }
      if (taskForEdit == null) {
         await bot.sendMessage(chatID, 'Нет доступа к этому дз.', {
            reply_markup: {
               keyboard: menus[chats[chatID]]
            }
         })
         bot.answerCallbackQuery(message.id)
         resetUserInput()
      } else {
         await bot.sendMessage(chatID, 'Введи новый текст для')
         await bot.sendMessage(chatID, buildHomeworkMessage([taskForEdit], taskForEdit.homework_lesson, chatID), { parse_mode: 'HTML' })
         bot.answerCallbackQuery(message.id)
         isWaitingForUserAnsw = { target: 'rewriteNewText', isWaiting: true, taskForEdit: taskForEdit }
      }
   }
   if (data.target == 'editDeadlineForHomework') {
      if (chats[chatID].class == 'basic') return
      let taskForEdit = null
      await getHomeworkFromDB()
      await new Promise((resolve) => setTimeout(resolve, 250));
      for (let key of Object.keys(homework)) {
         homework[key].forEach(async item => {
            console.log(item, data.taskID, 513)
            if (item.homework_id == data.taskID) {
               if (item.homework_lesson in menus.permissions[chats[chatID].permission_title] && item.homework_creator == chatID) {
                  taskForEdit = item
               }
            }
         })
      }
      if (taskForEdit == null) {
         await bot.sendMessage(chatID, 'Нет доступа к этому дз.', {
            reply_markup: {
               keyboard: menus[chats[chatID]]
            }
         })
         bot.answerCallbackQuery(message.id)
         resetUserInput()
      } else {
         await bot.sendMessage(chatID, 'Введи новый дедлайн для (Ответ требует формата дд.мм.гггг, например 01.01.1970. Обратите внимание на кол-во дней в месяце, чтобы домашка установилась правильно):')
         await bot.sendMessage(chatID, buildHomeworkMessage([taskForEdit], taskForEdit.homework_lesson, chatID), { parse_mode: 'HTML' })
         bot.answerCallbackQuery(message.id)
         isWaitingForUserAnsw = { target: 'rewriteNewDeadline', isWaiting: true, taskForEdit: taskForEdit }
      }
   }
})