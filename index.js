//Libs
const sqlite3 = require('sqlite3').verbose();
const TelegramBot = require('node-telegram-bot-api')
require('dotenv').config()
const { parse } = require('dotenv')
const fs = require('fs')
const axios = require('axios').default;
const path = require('path');

//Functions
const buildHomeworkMessage = require(path.resolve(__dirname, './commands/buildHomeworkMessage.js'))
const parseLessonsForOptions = require(path.resolve(__dirname, './commands/parseLessonsForOptions.js')) //Передаётся список предметов
const getParsedHomework = require(path.resolve(__dirname, './commands/getParsedHomework.js'))
const parseLessonsForDays = require(path.resolve(__dirname, './commands/parseLessonsForDays.js')); //Передаётся "сырая" дата апи вуза
const getOverdueHomework = require(path.resolve(__dirname, './commands/getOverdueHomework.js')); //Передаётся "сырая" дата апи вуза
const getListOfLessons = require(path.resolve(__dirname, './commands/getListOfLessons.js')); //Передаётся "сырая" дата апи вуза
const getHomeworkForTomorrow = require(path.resolve(__dirname, './commands/getHomeworkForTomorrow.js'));

//Options
const commands = require(path.resolve(__dirname, './options/commands.js'))
const menus = require(path.resolve(__dirname, './options/menus.js'))
const lessons = require(path.resolve(__dirname, './options/lessons.json'))
const APIData = require(path.resolve(__dirname, './options/vuzapi.json'))
const setDeadline = require(path.resolve(__dirname, './commands/setDeadline.js'))
const getEvennessOfWeek = require(path.resolve(__dirname, './commands/getEvennessOfWeek.js'))

let permission = []
let homework = {}
let chats = {}

const db = new sqlite3.Database(path.resolve(__dirname, './db/homework.db'), sqlite3.OPEN_READWRITE, (err) => {
   if (err) console.error(err)
})

let isWaitingForUserAnsw = { "target": null, "isWaiting": false }
let tempTask = {}


class Task {
   constructor(text, lesson, deadline, creator, type, group) {
      this.homework_text = text;
      this.homework_lesson = lesson;
      this.homework_deadline = deadline || 0;
      this.homework_creator = creator;
      this.homework_type = type;
      this.homework_english_group = group;
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
   await new Promise((resolve) => setTimeout(resolve, 250));
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
   await new Promise((resolve) => setTimeout(resolve, 250));
}

const setPermissionFromDB = (data) => {
   if (data <= 0) return {}
   permission = [...data]
}
const getPermissionFromDB = async () => {
   await db.all('SELECT * FROM permission', [], async (err, rows) => {
      if (err) return console.error(err.message)
      await setPermissionFromDB(rows)
   })

   await new Promise((resolve) => setTimeout(resolve, 250));
}


//ENV
const BOT_TOKEN = process.env.homeworkBot_token || '0'

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
   if (new Date().getUTCHours() + 3 == 14 && (new Date().getMinutes() + 1 >= 0 && new Date().getMinutes() + 1 <= 5)) {
      await getUsersFromDB()
      await getHomeworkFromDB()
      let homeworkForTomorrow = getHomeworkForTomorrow(homework)

      if (homeworkForTomorrow) {

         for (let chat of Object.keys(chats)) {
            try {
               let tempMessage = ''
               for (let lesson of Object.keys(homeworkForTomorrow)) {
                  tempMessage += buildHomeworkMessage(homeworkForTomorrow[lesson], lesson, chats[chat])
               }
               await bot.sendMessage(chat, '#завтра\nДомашка на завтра:\n' + tempMessage, { parse_mode: 'HTML' })
            } catch (err) {
               if (err.response.body.description == 'Bad Request: chat not found') {
                  await db.run('DELETE FROM student WHERE student_id=? ', [chat], (err) => {
                     if (err) return console.error(err)
                  })
               }
            }
         }
      }

      let overdueHomework = getOverdueHomework(homework, 7)

      if (overdueHomework) {
         for (let overdueLesson of Object.keys(overdueHomework)) {
            for (let overdueTask of overdueHomework[overdueLesson]) {
               await db.run('DELETE FROM homework WHERE homework_id=? ', [overdueTask.homework_id], (err) => {
                  if (err) return console.error(err)
               })
            }
         }
      }
      await getHomeworkFromDB()

      await axios.post('https://kai.ru/raspisanie?p_p_id=pubStudentSchedule_WAR_publicStudentSchedule10&p_p_lifecycle=2&p_p_resource_id=schedule', { groupId: '25212' },
         { headers: { 'content-type': 'application/x-www-form-urlencoded' } }
      ).then(async (response) => {
         await fs.writeFileSync('./options/vuzapi.json', JSON.stringify(response.data), (err) => {
            if (err) return console.error(err)
         })
         await fs.writeFileSync('./options/lessons.json', JSON.stringify(getListOfLessons(response.data)), (err) => {
            if (err) return console.error(err);
         })
      })
   }

}, 300_000)

bot.onText(/Пользователи/, async (message) => {
   await getUsersFromDB()
   if (!(message.chat.id in chats)) return
   if (chats[message.chat.id].permission_title != 'senior') return
   await db.all('SELECT * FROM student', [], async (err, data) => {
      if (err) return console.error(err)
      let temp = ''
      for (let item of data) {
         temp += `Nickname: ${item.student_nickname}\nID: ${item.student_id}\nPermissions: ${chats[item.student_id].permission_title}`
         temp += '\n=================\n'
      }
      await bot.sendMessage(message.chat.id, temp)
   })
})

bot.onText(/\/start/, async (message) => {
   await getUsersFromDB()
   let startInfo = 'Данный бот создавался для удобства, ведь в группе для "очень важной" информации уже месиво какое-то из вообще всего.\n\nВы можете поменять группу по иностранному языку, чтобы Вам отображалась домашние задания только Вашей группы (Если она есть в базе данных).\n\nТак же можете просматривать всё домашнее задание, имеющееся в базе данных (Домашние задания хранятся в боте вплоть до 7 дней после дедлайна, после чего удаляются).\n\nПри добавлении нового домашнего задания, всем, кто хоть раз активировал бота, придет сообщение об этом. Его можно отключить нажав на кнопку "Разное" под полем ввода сообщения, после - "Настройка получения уведомлений о добавлении нового дз". Ну или просто замутить бота.\n\nЕжедневно в 14:00-14:05 минут будет приходить напоминание со списком домашнего задания на завтра.\n\nЕсли бот по каким-либо причинам либо ошибкам упал/умер/перестал работать, то через 10 минут после этого он перезапустится (Весьма вероятно, что он вам даст знать об этом)'
   let adminInfo = 'А теперь, именно <i>Вы</i> обладаете властью над базой данных домашних заданий.\n<i>Вы</i> можете добавлять, изменять (только текст и дедлайн) и удалять домашние задания из бота. Прошу обратить внимание на <i>Вашу</i> группу по английскому, перед добавлением домашнего задания по этой дисциплине, необходимо, чтобы домашнее задание начальной группы было у начальной группы, а не у средней или крутой (Это касается только иностранного языка, пока что).\n\nНемного про иерархию: \nsenior - глав. админ. Вселенская власть.\nmiddle - админ, имеющий доступ ко всем дисциплинам.\njunior - админ, имеющий доступ только к дисциплинам, которые делятся на группы (Н-р, Английский язык)\n\nДедлайн дз автоматически ставится взависимости от расписания, дисциплины и её "типа" (практика, лекция, лабы).\n\nБот не поддерживает отправку файлов и фото и чего-либо ещё, кроме текста. Увы'
   if (!(message.chat.id in chats)) {

      db.run('INSERT INTO student(student_id,student_nickname,student_permission,student_english) VALUES (?,?,(SELECT permission_id FROM permission WHERE permission_title = ?),?)', [message.from.id, message.from.username, 'basic', 0])

      await bot.sendMessage(message.chat.id, startInfo, {
         parse_mode: 'HTML',
         reply_markup: {
            keyboard: menus.basic
         }
      })

   } else {
      if (chats[message.chat.id].permission_title != 'basic') {
         await bot.sendMessage(message.chat.id, startInfo + '\n\n-------\n\n' + adminInfo, {
            parse_mode: 'HTML',
            reply_markup: {
               keyboard: chats[message.chat.id].permission == 'basic' ? menus.basic : menus.extended
            }
         })
      } else {
         await bot.sendMessage(message.chat.id, startInfo, {
            parse_mode: 'HTML',
            reply_markup: {
               keyboard: menus.basic
            }
         })
      }
   }
})

bot.onText(/Разное/, async (message) => {
   await getUsersFromDB()
   if (!(message.chat.id in chats)) return
   await bot.sendMessage(message.chat.id, 'Что делаем?', {
      reply_markup: {
         keyboard: menus['разное'][chats[message.chat.id].permission_title]
      }
   })

})
bot.onText(/Работа с домашним заданием/, async (message) => {
   await getUsersFromDB()
   if (!(message.chat.id in chats)) return
   await bot.sendMessage(message.chat.id, 'Что делаем?', {
      reply_markup: {
         keyboard: menus['Работа с домашним заданием'].basic,
      }
   })

})
bot.onText(/Посмотреть дз/, async (message) => {
   await getUsersFromDB()
   if (!(message.chat.id in chats)) return
   await bot.sendMessage(message.chat.id, "По чему смотрим дз?", {
      reply_markup: JSON.stringify({
         inline_keyboard: [[{ text: 'Дз на завтра', callback_data: JSON.stringify({ target: 'homework', lesson: 'Завтра' }) }], [{ text: 'Дз по всем дисциплинам', callback_data: JSON.stringify({ target: 'homework', lesson: 'Всё' }) }], ...parseLessonsForOptions(Object.keys(lessons), 2, 'homework')]
      })
   })

})

bot.onText(/Выбрать группу по Английскому Языку/, async (message) => {

   await getUsersFromDB()
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
   await getUsersFromDB()
   if (!(message.chat.id in chats)) return
   await bot.sendMessage(message.chat.id, 'Что делаем?', {
      reply_markup: {
         keyboard: chats[message.chat.id].permission == 'basic' ? menus.basic : menus.extended
      }
   })
   resetUserInput()
})

bot.onText(/Профиль/, async (message) => {
   await getUsersFromDB()
   if (!(message.chat.id in chats)) return
   await getUsersFromDB()
   await bot.sendMessage(message.chat.id, `Ваш профиль:\nВыбранная группа по иностранному языку: ${chats[message.chat.id].student_english}${chats[message.chat.id].permission_title != 'basic' ? '\nВаш уровень прав: ' + chats[message.chat.id].permission_title : ''}`, {
      reply_markup: {
         keyboard: menus.profile
      }
   })
})

bot.onText(/Настройка получения уведомлений о добавлении нового дз/, async (message) => {
   await getUsersFromDB()
   if (!(message.chat.id in chats)) return
   await bot.sendMessage(message.chat.id, `В данный момент получение уведомления о добавлении нового домашнего задания ${chats[message.chat.id].student_notification ? 'включены.' : 'выключены.'}. Что Вы хотите сделать?`, {
      reply_markup: {
         keyboard: [['Выключить'], ['Включить'], ["Назад"]]
      }
   })
   isWaitingForUserAnsw = { target: 'editNotification', isWaiting: true }
})

bot.onText(/Добавить домашнее задание/, async (message) => {
   await getUsersFromDB()
   if (!(message.chat.id in chats)) return
   if (chats[message.chat.id].permission_title == 'basic') return
   await bot.sendMessage(message.chat.id, 'По какой дисциплине добавляем дз?', {
      reply_markup: {
         inline_keyboard: menus.homework[chats[message.chat.id].permission_title].add
      }
   })

})

bot.onText(/Изменить домашнее задание/, async (message) => {
   await getUsersFromDB()
   if (!(message.chat.id in chats)) return
   if (chats[message.chat.id].permission_title == 'basic') return
   await bot.sendMessage(message.chat.id, 'Введи айди дз, которое Вы хотите изменить.')
   isWaitingForUserAnsw = { target: 'editHomework', isWaiting: true }
})

bot.onText(/Удалить домашнее задание/, async (message) => {
   await getUsersFromDB()
   if (!(message.chat.id in chats)) return
   if (chats[message.chat.id].permission_title == 'basic') return
   await bot.sendMessage(message.chat.id, 'Введи айди дз, которое Вы хотите удалить.')
   isWaitingForUserAnsw = { target: 'deleteHomework', isWaiting: true }
})

bot.onText(/Действия с админами/, async (message) => {
   await getUsersFromDB()
   if (!(message.chat.id in chats)) return
   if (chats[message.chat.id].permission_title != 'senior') return

   await bot.sendMessage(message.chat.id, 'Что делаем?', {
      reply_markup: {
         keyboard: [...menus[message.text], ['Назад']]
      }
   })

})

bot.onText(/Изменить права юзеру/, async (message) => {
   if (!(message.chat.id in chats)) return
   if (chats[message.chat.id].permission_title != 'senior') return
   await getUsersFromDB()
   let userList = ''

   for (let user of Object.keys(chats)) {
      userList += `ID: <code>${chats[user].student_id}</code>. Username: @${chats[user].student_nickname}. Premissions: ${chats[user].permission_title}.\n`
   }
   await bot.sendMessage(message.chat.id, `Введите айди пользователя, которому будем менять права.\n${userList}`, { parse_mode: 'HTML' })
   isWaitingForUserAnsw = { target: 'editPermission', isWaiting: true, data: message.text }
})

bot.on('message', async (message) => {
   await getUsersFromDB()
   if (!(message.chat.id in chats) && (message.text != '/start')) {
      await bot.sendMessage(message.chat.id, 'Пожалуйста, пропишите /start для началы пользования ботом.', {
         reply_markup: {
            remove_keyboard: true
         }
      });
      return
   }
   if (commands.includes(message.text)) return
   if (isWaitingForUserAnsw.target == 'editNotification' && (message.text != 'Назад')) {
      let messageData = null
      if (message.text == 'Выключить') {
         messageData = 0
      } else if (message.text == 'Включить') {
         messageData = 1
      }
      if (messageData == null) return
      if (chats[message.chat.id].student_notification != messageData) {
         await db.run('UPDATE student SET student_notification=? WHERE student_id=?', [messageData, message.chat.id], (err) => {
            if (err) return console.error(err)
         })
      }
      await bot.sendMessage(message.chat.id, 'Настройка уведомлений прошла успешно.', {
         reply_markup: {
            keyboard: chats[message.chat.id].permission == 'basic' ? menus.basic : menus.extended
         }
      })
      resetUserInput()
      await getUsersFromDB()
   }
   if (isWaitingForUserAnsw.target == 'addHomeworkText' && (message.text != 'Назад')) {
      tempTask.text = message.text
      await bot.sendMessage(message.chat.id, 'Добавим дедлайн?', {
         reply_markup: {
            inline_keyboard: [[{ text: 'Да', callback_data: JSON.stringify({ target: 'addDeadline', data: 'yes' }) }, { text: 'Нет', callback_data: JSON.stringify({ target: 'addDeadline', data: 'no' }) }]]
         }
      })
   }
   if (isWaitingForUserAnsw.target == 'addHomeworkType' && (message.text != 'Назад')) {
      await bot.sendMessage(message.chat.id, 'Пожалуйста, выберите "тип" дисциплины, по которой Вы добавляете домашнее задание.')
   }
   if (isWaitingForUserAnsw.target == 'addDeadline' && (message.text != 'Назад')) {
      try {
         let tempDeadline = message.text.match(/(\d{2})\.(\d{2})\.(\d{4})/)
         tempTask.deadline = new Date((+tempDeadline[1] - 1) * 86_400_000 + (+tempDeadline[2] - 1) * 2_629_746_000 + (+tempDeadline[3] - 1970) * 31_556_952_000)
         if (tempTask.deadline < new Date()) {
            await bot.sendMessage(message.chat.id, 'Ввод уже прошедшего времени невозможен. Пожалуйста, введите дедлайн корректно.')
         } else {
            await getUsersFromDB()
            let taskForAdd = new Task(tempTask.text, tempTask.lesson, tempTask.deadline, message.chat.id, tempTask.type, tempTask.lesson == 'Иностранный язык' ? chats[message.chat.id].student_english : 0)
            db.run('INSERT INTO homework(homework_text,homework_lesson,homework_deadline,homework_creator,homework_type,homework_english_group) VALUES (?,?,?,?,?,?)', [taskForAdd.homework_text, taskForAdd.homework_lesson, taskForAdd.homework_deadline, taskForAdd.homework_creator, taskForAdd.homework_type, taskForAdd.homework_english_group], (err) => {
               if (err) return console.error(err)
            })
            await bot.sendMessage(message.chat.id, 'Домашка добавлена.', {
               reply_markup: {
                  keyboard: chats[message.chat.id].permission == 'basic' ? menus.basic : menus.extended
               }
            })
            for (let chat of Object.keys(chats)) {
               if (+chat != message.chat.id && chats[chat].student_notification && (chats[chat].student_english == taskForAdd.homework_english_group || taskForAdd.homework_english_group == 0 || chats[chat].permission_title == 'senior')) {
                  try {
                     await bot.sendMessage(+chat, 'Было добавлено новое домашнее задание:\n' + buildHomeworkMessage([taskForAdd], taskForAdd.homework_lesson, chats[chat]), { parse_mode: 'HTML' })
                  } catch (error) {
                     if (error.response.body.description == 'Bad Request: chat not found') {
                        await db.run('DELETE FROM student WHERE student_id=? ', [chat], (err) => {
                           if (err) return console.error(err)
                        })
                     }
                  }
               }
            }
            resetUserInput()
            resetTempTask()
         }
      } catch (error) {
         await bot.sendMessage(message.chat.id, 'Дедлайн введен неверно. Проверьте правильность написания дедлайна. Формат: дд.мм.гггг, между данными ставится точка. Либо произошла непредвиденная ошибка')
      }
   }
   if (isWaitingForUserAnsw.target == 'editHomework' && (message.text != 'Назад')) {
      await bot.sendMessage(message.chat.id, 'Что меняем у дз?', {
         reply_markup: {
            inline_keyboard: [[{ text: 'Текст', callback_data: JSON.stringify({ target: 'editTextForHomework', taskID: message.text }) }], [{ text: 'Дедлайн', callback_data: JSON.stringify({ target: 'editDeadlineForHomework', taskID: message.text }) }]]
         }
      })
   }
   if (isWaitingForUserAnsw.target == 'rewriteNewText' && (message.text != 'Назад')) {
      isWaitingForUserAnsw.taskForEdit.homework_text = message.text
      db.run('UPDATE homework SET homework_text=? WHERE homework_id=?', [message.text, isWaitingForUserAnsw.taskForEdit.homework_id], (err) => {
         if (err) return console.error(err)
      })
      await bot.sendMessage(message.chat.id, 'Дз успешно изменено.', {
         reply_markup: {
            keyboard: chats[message.chat.id].permission == 'basic' ? menus.basic : menus.extended
         }
      })
      resetUserInput()
      await getHomeworkFromDB()
   }
   if (isWaitingForUserAnsw.target == 'rewriteNewDeadline' && (message.text != 'Назад')) {
      try {
         let tempDeadline = message.text.match(/(\d{2})\.(\d{2})\.(\d{4})/)
         if (tempDeadline < new Date()) {
            await bot.sendMessage(message.chat.id, 'Ввод уже прошедшего времени невозможен. Пожалуйста, введите дедлайн корректно.')
         } else {
            isWaitingForUserAnsw.taskForEdit.homework_deadline = new Date((+tempDeadline[1] - 1) * 86_400_000 + (+tempDeadline[2] - 1) * 2_629_746_000 + (+tempDeadline[3] - 1970) * 31_556_952_000)
            db.run('UPDATE homework SET homework_deadline=? WHERE homework_id=?', [isWaitingForUserAnsw.taskForEdit.homework_deadline, isWaitingForUserAnsw.taskForEdit.homework_id], (err) => {
               if (err) return console.error(err)
            })
            await bot.sendMessage(message.chat.id, 'Дз успешно изменено.', {
               reply_markup: {
                  keyboard: chats[message.chat.id].permission == 'basic' ? menus.basic : menus.extended
               }
            })
            resetUserInput()
            await getHomeworkFromDB()
         }
      } catch (error) {
         await bot.sendMessage(message.chat.id, 'Дедлайн введен неверно. Проверьте правильность написания дедлайна. Формат: дд.мм.гггг, между данными ставится точка.')
      }


   }
   if (isWaitingForUserAnsw.target == 'deleteHomework' && (message.text != 'Назад')) {
      await getHomeworkFromDB()
      await getUsersFromDB()

      let homeworkLessons = Object.keys(homework)
      let isHomeworkHaveFound = false
      homeworkLessons.forEach(lesson => {
         for (let i = 0; i < homework[lesson].length; i++) {
            if (homework[lesson][i].homework_id == message.text && (homework[lesson][i].homework_creator == message.chat.id || chats[message.chat.id].permission_title == 'senior') && lesson in menus.permissions[chats[message.chat.id].permission_title]) return isHomeworkHaveFound = true
         }
      })

      if (isHomeworkHaveFound) {
         await db.run('DELETE FROM homework WHERE homework_id = ?', [message.text], (err) => {
            if (err) return console.error(err.message)
         })
         await bot.sendMessage(message.chat.id, 'Дз успешно удалено.', {
            reply_markup: {
               keyboard: chats[message.chat.id].permission == 'basic' ? menus.basic : menus.extended
            }
         })
         await getHomeworkFromDB()

         resetUserInput()
      } else {
         await bot.sendMessage(message.chat.id, 'Дз не было найдено либо у Вас нет к нему доступа.', {
            reply_markup: {
               keyboard: chats[message.chat.id].permission == 'basic' ? menus.basic : menus.extended
            }
         })
         resetUserInput()
      }

   }
   if (isWaitingForUserAnsw.target == 'editPermission' && (message.text != 'Назад')) {
      if (!isWaitingForUserAnsw.data) return
      await getPermissionFromDB()

      let temp = []
      for (let item of permission) {
         temp.push([{ text: item.permission_title, callback_data: JSON.stringify({ target: 'editPermission', permission: item.permission_id, user: message.text }) }])
      }
      await bot.sendMessage(message.chat.id, 'Какой уровень прав установить пользователю?', {
         reply_markup: {
            inline_keyboard: temp
         }
      })
   }
})

bot.on('callback_query', async (message) => {
   await getUsersFromDB()
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
      if (data.lesson == 'Всё') {
         if (Object.keys(homework).length > 0) {
            let tempMessage = ''
            for (let lesson of Object.keys(homework)) {
               tempMessage += buildHomeworkMessage(homework[lesson], lesson, chats[chatID]) + '\n';
            }
            await bot.sendMessage(chatID, tempMessage, { parse_mode: 'HTML' })
         } else {
            await bot.sendMessage(chatID, `Дз нету!`)
         }
         bot.answerCallbackQuery(message.id)
      } else if (data.lesson == 'Завтра') {
         let homeworkForTomorrow = getHomeworkForTomorrow(homework)
         if (Object.keys(homeworkForTomorrow).length > 0) {
            let tempMessage = ''
            for (let lesson of Object.keys(homeworkForTomorrow)) {
               tempMessage += buildHomeworkMessage(homeworkForTomorrow[lesson], lesson, chats[chatID])
            }
            await bot.sendMessage(chatID, '#завтра\nДомашка на завтра:\n' + tempMessage, { parse_mode: 'HTML' })
         } else {
            await bot.sendMessage(chatID, `Дз на завтра отсутствует.`)
         }
         bot.answerCallbackQuery(message.id)
      } else {
         if (homework[Object.keys(lessons)[data.lesson]]) {
            await bot.sendMessage(chatID, buildHomeworkMessage(homework[Object.keys(lessons)[data.lesson]], Object.keys(lessons)[data.lesson], chats[chatID]), { parse_mode: 'HTML' })
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


   if (data.target == 'addHomeworkText') {
      if (chats[chatID].class == 'basic') return

      if (!(tempTask.lesson)) {
         bot.answerCallbackQuery(message.id)
         return await bot.sendMessage(chatID, 'Домашнее задание заполнено некорректно. Начните сначала.')
      }
      if (!(tempTask.lesson in menus.permissions[chats[chatID].permission_title])) {
         bot.answerCallbackQuery(message.id)
         return await bot.sendMessage(chatID, 'У Вас нет доступа к добавлению дз по этой дисциплине.', {
            reply_markup: {
               keyboard: chats[message.chat.id].permission == 'basic' ? menus.basic : menus.extended
            }
         })
      }

      tempTask.type = lessons[tempTask.lesson][data.lesson]

      resetUserInput();
      await bot.sendMessage(chatID, `Что задали по дисциплине "${tempTask.lesson}"?`)
      bot.answerCallbackQuery(message.id)
      tempTask.type = lessons[tempTask.lesson][data.lesson]
      isWaitingForUserAnsw = { target: 'addHomeworkText', isWaiting: true }

   }
   if (data.target == 'addHomeworkType') {
      await getUsersFromDB()

      if (!tempTask.lesson) {
         let lessonID = data.lesson
         tempTask.lesson = Object.keys(lessons)[lessonID]
      }

      if (Object.keys(lessons).indexOf(tempTask.lesson) != data.lesson && !data.isSettedType) {
         resetTempTask()
         let lessonID = data.lesson
         tempTask.lesson = Object.keys(lessons)[lessonID]
      }

      if (!(tempTask.lesson in menus.permissions[chats[chatID].permission_title])) {
         bot.answerCallbackQuery(message.id)
         return await bot.sendMessage(chatID, 'У Вас нет доступа к добавлению дз по этой дисциплине.', {
            reply_markup: {
               keyboard: chats[chatID].permission == 'basic' ? menus.basic : menus.extended
            }
         })
      }
      await bot.sendMessage(chatID, `Добавление дз для какого "типа" дисциплины "${tempTask.lesson}"?`, {
         reply_markup: JSON.stringify({
            inline_keyboard: parseLessonsForOptions(lessons[tempTask.lesson], 1, 'addHomeworkText', [], { isSettedType: true })
         })
      })
      isWaitingForUserAnsw = { target: 'addHomeworkType', isWaiting: true }
      bot.answerCallbackQuery(message.id)

   }

   if (data.target == 'addDeadline') {
      if (chats[chatID].class == 'basic') return
      if (!(tempTask.text && tempTask.lesson && tempTask.type)) {
         return await bot.sendMessage(chatID, 'Домашнее задание заполнено некорректно. Начните сначала.')
      }

      if (!(tempTask.lesson in menus.permissions[chats[chatID].permission_title])) {
         bot.answerCallbackQuery(message.id)
         return await bot.sendMessage(chatID, 'У Вас нет доступа к добавлению дз по этой дисциплине.', {
            reply_markup: {
               keyboard: chats[chatID].permission == 'basic' ? menus.basic : menus.extended
            }
         })

      }

      if (data.data == 'yes') {
         isWaitingForUserAnsw = { target: 'addDeadline', isWaiting: true }
         await bot.sendMessage(chatID, 'Какой дедлайн у домашки? (Ответ требует формата дд.мм.гггг, например 01.01.1970. Обратите внимание на кол-во дней в месяце, чтобы домашка установилась правильно)')
         bot.answerCallbackQuery(message.id)
      } else {
         await getUsersFromDB()
         let taskForAdd = new Task(tempTask.text, tempTask.lesson, tempTask.deadline, message.from.id, tempTask.type, tempTask.lesson == 'Иностранный язык' ? chats[chatID].student_english : 0)
         setDeadline(parseLessonsForDays(APIData), taskForAdd, getEvennessOfWeek())

         await db.run('INSERT INTO homework(homework_text,homework_lesson,homework_deadline,homework_creator,homework_type,homework_english_group) VALUES (?,?,?,?,?,?)', [taskForAdd.homework_text, taskForAdd.homework_lesson, taskForAdd.homework_deadline, taskForAdd.homework_creator, taskForAdd.homework_type, taskForAdd.homework_english_group], (err) => {
            if (err) return console.error(err)
         })

         await bot.sendMessage(chatID, 'Домашка добавлена.', {
            reply_markup: {
               keyboard: menus[chats[chatID].permission_title]
            }
         })

         for (let chat of Object.keys(chats)) {
            if (+chat != chatID && chats[chat].student_notification && (chats[chat].student_english == taskForAdd.homework_english_group || taskForAdd.homework_english_group == 0 || chats[chat].permission_title == 'senior')) {
               try {
                  await bot.sendMessage(+chat, 'Было добавлено новое домашнее задание:\n' + buildHomeworkMessage([taskForAdd], taskForAdd.homework_lesson, chats[chat]), { parse_mode: 'HTML' })
               } catch (error) {
                  if (error.response.body.description == 'Bad Request: chat not found') {
                     await db.run('DELETE FROM student WHERE student_id=? ', [chat], (err) => {
                        if (err) return console.error(err)
                     })
                  }
               }
            }
         }

         resetUserInput()
         resetTempTask()
         bot.answerCallbackQuery(message.id)

      }
   }
   if (data.target == 'editTextForHomework') {
      if (chats[chatID].class == 'basic') return
      let taskForEdit = null
      await getHomeworkFromDB()
      await getUsersFromDB()

      for (let key of Object.keys(homework)) {
         homework[key].forEach(async item => {
            if (item.homework_id == data.taskID) {
               if (item.homework_lesson in menus.permissions[chats[chatID].permission_title] && (item.homework_creator == chatID || chats[chatID].permission_id == 4)) {
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
         await bot.sendMessage(chatID, 'Введи новый текст для:\n' + buildHomeworkMessage([taskForEdit], taskForEdit.homework_lesson, chats[chatID]), { parse_mode: 'HTML' })
         bot.answerCallbackQuery(message.id)
         isWaitingForUserAnsw = { target: 'rewriteNewText', isWaiting: true, taskForEdit: taskForEdit }
      }
   }
   if (data.target == 'editDeadlineForHomework') {
      if (chats[chatID].class == 'basic') return
      let taskForEdit = null
      await getHomeworkFromDB()
      await getUsersFromDB()
      for (let key of Object.keys(homework)) {
         homework[key].forEach(async item => {
            if (item.homework_id == data.taskID) {
               if (item.homework_lesson in menus.permissions[chats[chatID].permission_title] && (item.homework_creator == chatID || chats[chatID].permission_id == 4)) {
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
         await bot.sendMessage(chatID, buildHomeworkMessage([taskForEdit], taskForEdit.homework_lesson, chats[chatID]), { parse_mode: 'HTML' })
         bot.answerCallbackQuery(message.id)
         isWaitingForUserAnsw = { target: 'rewriteNewDeadline', isWaiting: true, taskForEdit: taskForEdit }
      }
   }
   if (data.target == 'editPermission') {
      await getUsersFromDB()
      if (data.user == '1386879737') {
         await bot.sendMessage(chatID, 'Вы не можете изменить права данному пользователю.', {
            reply_markup: {
               keyboard: chats[chatID].permission == 'basic' ? menus.basic : menus.extended
            }
         })
         bot.answerCallbackQuery(message.id)
      } else {
         await db.run('UPDATE student SET student_permission = ? WHERE student_id = ?', [data.permission, data.user], (err) => {
            if (err) return console.error(err.message)
         })
         await bot.sendMessage(chatID, 'Права пользователя обновлены', {
            reply_markup: {
               keyboard: chats[chatID].permission == 'basic' ? menus.basic : menus.extended
            }
         })
         await bot.sendMessage(data.user, `Ваши права доступа были изменены до уровня <strong>${data.permission}</strong>`, { parse_mode: 'HTML' })
         await getUsersFromDB()
         bot.answerCallbackQuery(message.id)
      }
   }
})