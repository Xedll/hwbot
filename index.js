//Libs
const sqlite3 = require("sqlite3").verbose()
const TelegramBot = require("node-telegram-bot-api")
require("dotenv").config()
const fs = require("fs")
const axios = require("axios").default
const path = require("path")

//Functions
const buildHomeworkMessage = require(path.resolve(__dirname, "./commands/buildHomeworkMessage.js"))
const getHomeworkArray = require(path.resolve(__dirname, "./commands/getHomeworkArray.js"))
const parseLessonsForOptions = require(path.resolve(__dirname, "./commands/parseLessonsForOptions.js")) //Передаётся список предметов
const getParsedHomework = require(path.resolve(__dirname, "./commands/getParsedHomework.js"))
const parseLessonsForDays = require(path.resolve(__dirname, "./commands/parseLessonsForDays.js")) //Передаётся "сырая" дата апи вуза
const getListOfLessons = require(path.resolve(__dirname, "./commands/getListOfLessons.js")) //Передаётся "сырая" дата апи вуза
const getHomeworkForTomorrow = require(path.resolve(__dirname, "./commands/getHomeworkForTomorrow.js"))

//Options
const commands = require(path.resolve(__dirname, "./options/commands.js"))
const menus = require(path.resolve(__dirname, "./options/menus.js"))
const lessons = require(path.resolve(__dirname, "./options/lessons.json"))
const APIData = require(path.resolve(__dirname, "./options/vuzapi.json"))
const setDeadline = require(path.resolve(__dirname, "./commands/setDeadline.js"))
const getEvennessOfWeek = require(path.resolve(__dirname, "./commands/getEvennessOfWeek.js"))

let permission = []
let homework = {}
let chats = {}
let files = {}
let pool = {}
let books = {}
let homeworkWithFiles = {}
let groupNum = undefined || 4201
let groupApiID = undefined || 26022

const db = new sqlite3.Database(path.resolve(__dirname, "../db/homework.db"), sqlite3.OPEN_READWRITE, (err) => {
	if (err) console.error(err)
})

const resetUserInput = (chatID) => {
	pool[chatID].target = null
}
const resetTempTask = (chatID) => {
	pool[chatID].tempTask = {}
}

//DB functions

const setUsersFromDB = (data) => {
	if (data.length <= 0) return (chats = {})
	chats = {}
	for (let i of data) {
		chats[i.student_id] = { ...i }
	}
}
const getUsersFromDB = async () => {
	await db.all("SELECT * FROM student JOIN permission ON student.student_permission=permission.permission_id", [], async (err, rows) => {
		if (err) {
			console.log("54 line")
			return console.error(err.message)
		}
		console.log("57 line, Getting all students with permissions")
		await setUsersFromDB(rows)
	})
	await new Promise((resolve) => setTimeout(resolve, 250))
}

const setHomeworkFromDB = (data) => {
	if (data.length <= 0) return {}
	homework = getParsedHomework(data)
}
const getHomeworkFromDB = async () => {
	await db.all("SELECT * FROM homework", [], async (err, rows) => {
		if (err) {
			console.log("70 line")
			return console.error(err.message)
		}
		console.log("73 line, Getting all homework")
		await setHomeworkFromDB(rows)
	})
	await new Promise((resolve) => setTimeout(resolve, 250))
}

const setPermissionFromDB = (data) => {
	if (data.length <= 0) return
	permission = [...data]
}
const getPermissionFromDB = async () => {
	await db.all("SELECT * FROM permission", [], async (err, rows) => {
		if (err) {
			console.log("86 line")
			return console.error(err.message)
		}
		console.log("89 line, Getting all permissions")
		await setPermissionFromDB(rows)
	})

	await new Promise((resolve) => setTimeout(resolve, 250))
}

const setFileFromDB = (data) => {
	if (data.length <= 0) return (files = {})
	files = {}
	for (let item of data) {
		files[item.file_id] = item
	}
}
const getFileFromDB = async () => {
	await db.all("SELECT * FROM file", [], async (err, rows) => {
		if (err) {
			console.log("105 line")
			return console.error(err.message)
		}
		console.log("108 line, Getting all files")
		await setFileFromDB(rows)
	})

	await new Promise((resolve) => setTimeout(resolve, 250))
}

const setHomeworkWithFileFromDB = (data) => {
	if (data.length <= 0) return (homeworkWithFiles = {})
	homeworkWithFiles = {}
	for (let item of data) {
		if (homeworkWithFiles[item.homework_id]) {
			homeworkWithFiles[item.homework_id].push(item.file_id)
		} else {
			homeworkWithFiles[item.homework_id] = [item.file_id]
		}
	}
}
const getHomeworkWithFileFromDB = async () => {
	await db.all("SELECT * FROM homework_has_file", [], async (err, rows) => {
		if (err) {
			console.log("129 line")
			return console.error(err.message)
		}
		console.log("132 line, Getting all files")
		await setHomeworkWithFileFromDB(rows)
	})
	await new Promise((resolve) => setTimeout(resolve, 250))
}

const setBooksFromDB = (data) => {
	if (data.length <= 0) return (books = {})
	books = {}
	for (let item of data) {
		books[item.file_id] = item.book_name
	}
}
const getBooksFromDB = async () => {
	db.all("SELECT * FROM book", [], async (err, rows) => {
		if (err) {
			console.log("129 line")
			return console.error(err.message)
		}
		console.log("132 line, Getting all files")
		setBooksFromDB(rows)
	})
	await new Promise((resolve) => setTimeout(resolve, 250))
}

//ENV
const BOT_TOKEN = process.env.homeworkBot_token || "0"

const bot = new TelegramBot(BOT_TOKEN, {
	polling: true,
})

bot.on("polling_error", (err) => {
	console.error(err.message)
})

//!!Starting setup

getUsersFromDB()
getHomeworkFromDB()
getHomeworkWithFileFromDB()
getFileFromDB()

//!!

//!!TIMER

setInterval(async () => {
	//!!Прок на каждые 5 минут
	if (new Date().getUTCHours() + 3 == 14 && new Date().getMinutes() + 1 >= 0 && new Date().getMinutes() + 1 <= 5) {
		await getUsersFromDB()
		await getHomeworkFromDB()
		let homeworkForTomorrow = getHomeworkForTomorrow(homework)

		if (homeworkForTomorrow) {
			for (let chatID of Object.keys(chats)) {
				try {
					for (let lesson of Object.keys(homeworkForTomorrow)) {
						if (lesson == "Иностранный язык") {
							let tempArray = []
							if (!homeworkForTomorrow[lesson]) return
							for (let item of homeworkForTomorrow[lesson]) {
								if (item.homework_english_group == chats[chatID].student_english) {
									tempArray.push(item)
								}
							}
							homeworkForTomorrow[lesson] = tempArray
						}
					}

					if (
						Object.keys(homeworkForTomorrow).length == 1 &&
						Object.keys(homeworkForTomorrow)[0] == "Иностранный язык" &&
						homeworkForTomorrow["Иностранный язык"].length < 1
					) {
						console.log(true)
						continue
					}
					await bot.sendMessage(chatID, "#завтра")
					for (let lesson of Object.keys(homeworkForTomorrow)) {
						await bot.sendMessage(chatID, `Дз по дисциплине "<u>${lesson}</u>":`, {
							parse_mode: "HTML",
						})

						for (let hw of homeworkForTomorrow[lesson]) {
							if (
								!(
									chats[chatID].student_english == hw.homework_english_group ||
									hw.homework_english_group == 0 ||
									chats[chatID].permission_title == "senior"
								)
							)
								continue
							let hwText = buildHomeworkMessage(hw, chats[chatID])

							let filesForSending = []
							if (homeworkWithFiles[hw.homework_id]) {
								for (let fileID of homeworkWithFiles[hw.homework_id]) {
									if (!files[fileID]) return
									filesForSending.push(files[fileID])
								}
							}
							if (filesForSending.length == 0) {
								await bot.sendMessage(chatID, hwText, {
									parse_mode: "HTML",
								})
							}
							if (filesForSending.length == 1) {
								if (filesForSending[0].file_type == "document") {
									if (hwText.length <= 1024) {
										await bot.sendDocument(chatID, filesForSending[0].file_name, {
											caption: hwText,
											parse_mode: "HTML",
										})
									} else {
										await bot.sendMessage(chatID, hwText + "\n&#9660; Документ к дз снизу &#9660;", {
											parse_mode: "HTML",
										})
										await bot.sendDocument(chatID, filesForSending[0].file_name)
									}
								}
								if (filesForSending[0].file_type == "photo") {
									if (hwText.length <= 1024) {
										await bot.sendPhoto(chatID, filesForSending[0].file_name, {
											caption: hwText,
											parse_mode: "HTML",
										})
									} else {
										await bot.sendMessage(chatID, hwText + "\n&#9660; Фото к дз снизу &#9660;", {
											parse_mode: "HTML",
										})
										await bot.sendPhoto(chatID, filesForSending[0].file_name)
									}
								}
							}
							if (filesForSending.length > 1) {
								let photos = []
								let docs = []
								let flag = false
								for (let item of filesForSending) {
									if (item.file_type == "document")
										docs.push({
											type: "document",
											media: item.file_name,
										})
									if (item.file_type == "photo")
										photos.push({
											type: "photo",
											media: item.file_name,
										})
								}
								if (photos.length > 0) {
									if (hwText.length <= 990) {
										photos[0].caption = "\n&#9660; Файлы к дз снизу &#9660;\n" + hwText
										photos[0].parse_mode = "HTML"
										await bot.sendMediaGroup(chatID, photos)
										flag = true
									} else {
										await bot.sendMessage(chatID, hwText, {
											parse_mode: "HTML",
										})
										await bot.sendMediaGroup(chatID, photos)
									}
								}
								if (docs.length > 0) {
									if (!flag && hwText.length <= 990) {
										docs[0].caption = hwText
										docs[0].parse_mode = "HTML"
										await bot.sendMediaGroup(chatID, docs)
									} else if (flag) {
										docs[0].caption = "&#9650; Файлы к дз, что выше &#9650;"
										docs[0].parse_mode = "HTML"
										await bot.sendMediaGroup(chatID, docs)
									}
								}
							}
						}
					}
				} catch (err) {
					if (err.response.body.description == "Bad Request: chat not found") {
						await db.run("DELETE FROM student WHERE student_id=? ", [chatID], (err) => {
							if (err) {
								console.log("275 line")
								return console.error(err)
							}
							console.log("278 line, Deleting student bc err")
						})
					}
				}
			}
		}

		let overdueHomework = getHomeworkArray(homework, 30, { mode: "overdue" })

		if (overdueHomework) {
			for (let overdueLesson of Object.keys(overdueHomework)) {
				for (let overdueTask of overdueHomework[overdueLesson]) {
					await db.run("DELETE FROM homework WHERE homework_id=? ", [overdueTask.homework_id], (err) => {
						if (err) {
							console.log("292 line")
							return console.error(err)
						}
						console.log("295 line, Deleting homework bc overdue")
					})
				}
			}
		}
		await getHomeworkFromDB()
		await axios
			.post(
				`https://kai.ru/raspisanie?p_p_id=pubStudentSchedule_WAR_publicStudentSchedule10&p_p_lifecycle=2&p_p_resource_id=getGroupsURL&query=${groupNum}`
			)
			.then((data) => (groupApiID = data.data[0].id))
		await axios
			.post(
				"https://kai.ru/raspisanie?p_p_id=pubStudentSchedule_WAR_publicStudentSchedule10&p_p_lifecycle=2&p_p_resource_id=schedule",
				{ groupId: groupApiID },
				{
					headers: {
						"content-type": "application/x-www-form-urlencoded",
					},
				}
			)
			.then(async (response) => {
				fs.writeFileSync(__dirname + "/options/vuzapi.json", JSON.stringify(response.data), { flag: "w+" })
				fs.writeFileSync(__dirname + "/options/lessons.json", JSON.stringify(getListOfLessons(response.data)), { flag: "w+" })
			})
	}
}, 300_000)

bot.onText(/\/start/, async (message) => {
	await getUsersFromDB()
	let chatID = message.chat.id
	let startInfo =
		'Данный бот создавался для удобства, ведь в группе для "очень важной" информации уже месиво какое-то из вообще всего. \
\n\nВы можете поменять группу по иностранному языку, чтобы Вам отображалась домашние задания только Вашей группы (Если она есть в базе данных). \
\n\nТак же можете просматривать всё домашнее задание, имеющееся в базе данных \
(Домашние задания хранятся в боте вплоть до 30 дней после дедлайна, после чего удаляются. Старое дз находится в "архиве" при опции просмотра дз). \
\n\nПри добавлении нового домашнего задания, всем, кто хоть раз активировал бота, придет сообщение об этом. \
Его можно отключить нажав на кнопку "Разное" под полем ввода сообщения, после - "Настройка получения уведомлений о добавлении нового дз". \
Ну или просто замутить бота.\n\nЕжедневно в 14:00-14:05 минут будет приходить напоминание со списком домашнего задания на завтра. \
\n\nЕсли бот по каким-либо причинам либо ошибкам упал/умер/перестал работать, то прошу сообщить об этом либо старосте либо в чатик написать наш. \
\nА ещё не забудьте выбрать группу по английскому (Профиль -> Выбрать группу по англу), чтобы вам приходила ваша домашка, если она есть.'
	let adminInfo =
		'А теперь, именно <i>Вы</i> обладаете властью над базой данных домашних заданий. \
\n<i>Вы</i> можете добавлять, изменять (только текст и дедлайн) и удалять домашние задания из бота. \
Прошу обратить внимание на <i>Вашу</i> группу по английскому, перед добавлением домашнего задания по этой дисциплине, \
необходимо, чтобы домашнее задание начальной группы было у начальной группы, а не у средней или крутой \
(Это касается только иностранного языка, пока что).\n\nНемного про иерархию:  \
4 - глав. админ. Вселенская власть. 3 - админ, имеющий доступ ко всем дисциплинам. 2 - админ, имеющий доступ только к \
дисциплинам, которые делятся на группы (Н-р, Английский язык)\n\nДедлайн дз автоматически ставится взависимости от расписания, \
дисциплины и её "типа" (практика, лекция, лабы).'
	if (!(chatID in chats)) {
		await db.run(
			"INSERT INTO student(student_id,student_nickname,student_permission,student_english) VALUES (?,?,(SELECT permission_id FROM permission WHERE permission_title = ?),?)",
			[message.from.id, message.from.username || "Этот пользователь не имеет никнейма", "basic", 0],
			(err) => {
				if (err) {
					console.log("347 line")
					return console.error(err)
				}
				console.log("350 line. Adding student via /start")
			}
		)

		await bot.sendMessage(chatID, startInfo, {
			parse_mode: "HTML",
			reply_markup: {
				keyboard: menus().basic,
			},
		})
	} else {
		if (chats[chatID].permission_title != "basic") {
			await bot.sendMessage(chatID, startInfo + "\n\n-------\n\n" + adminInfo, {
				parse_mode: "HTML",
				reply_markup: {
					keyboard: chats[chatID].permission_title == "basic" ? menus().basic : menus().extended,
				},
			})
		} else {
			await bot.sendMessage(chatID, startInfo, {
				parse_mode: "HTML",
				reply_markup: {
					keyboard: menus().basic,
				},
			})
		}
	}
})

bot.onText(/Пользователи/, async (message) => {
	await getUsersFromDB()
	let chatID = message.chat.id
	if (!(chatID in chats)) {
		await bot.sendMessage(chatID, "Пожалуйста, пропишите /start для началы пользования ботом.", {
			reply_markup: JSON.stringify({
				remove_keyboard: true,
			}),
		})
		return
	}
	if (chats[chatID].permission_title != "senior") return
	db.all("SELECT * FROM student", [], async (err, data) => {
		if (err) return console.error(err)
		console.log("386 line. Gitting students via Пользователи")
		let temp = ""
		for (let item of data) {
			temp += `Nickname: ${item.student_nickname}\nID: ${item.student_id}\nPermissions: ${chats[item.student_id].permission_title}`
			temp += "\n=================\n"
		}
		await bot.sendMessage(chatID, temp)
	})
})

bot.onText(/Разное/, async (message) => {
	await getUsersFromDB()
	let chatID = message.chat.id
	if (!(chatID in chats)) {
		await bot.sendMessage(chatID, "Пожалуйста, пропишите /start для началы пользования ботом.", {
			reply_markup: JSON.stringify({
				remove_keyboard: true,
			}),
		})
		return
	}
	await bot.sendMessage(chatID, "Что делаем?", {
		reply_markup: {
			keyboard: menus()["разное"][chats[chatID].permission_title],
		},
	})
})
bot.onText(/Редактирование домашнего задания/, async (message) => {
	await getUsersFromDB()
	let chatID = message.chat.id
	if (!(chatID in chats)) {
		await bot.sendMessage(chatID, "Пожалуйста, пропишите /start для началы пользования ботом.", {
			reply_markup: JSON.stringify({
				remove_keyboard: true,
			}),
		})
		return
	}
	await bot.sendMessage(chatID, "Что делаем?", {
		reply_markup: {
			keyboard: menus()["Работа с домашним заданием"].basic,
		},
	})
})
bot.onText(/Посмотреть дз/, async (message) => {
	await getUsersFromDB()
	let chatID = message.chat.id
	if (!(chatID in chats)) {
		await bot.sendMessage(chatID, "Пожалуйста, пропишите /start для началы пользования ботом.", {
			reply_markup: JSON.stringify({
				remove_keyboard: true,
			}),
		})
		return
	}
	await bot.sendMessage(chatID, "По чему смотрим дз?", {
		reply_markup: JSON.stringify({
			inline_keyboard: [
				[
					{
						text: "Дз на завтра",
						callback_data: JSON.stringify({
							target: "homework",
							lesson: "Завтра",
						}),
					},
				],
				[
					{
						text: "Дз по всем дисциплинам",
						callback_data: JSON.stringify({
							target: "homework",
							lesson: "Всё",
						}),
					},
				],
				[
					{
						text: "Архив дз",
						callback_data: JSON.stringify({
							target: "homework",
							lesson: "Архив",
						}),
					},
				],
				...parseLessonsForOptions(Object.keys(lessons), 2, "homework"),
			],
		}),
	})
})

bot.onText(/Выбрать группу по Английскому Языку/, async (message) => {
	await getUsersFromDB()
	let chatID = message.chat.id
	if (!(chatID in chats)) {
		await bot.sendMessage(chatID, "Пожалуйста, пропишите /start для началы пользования ботом.", {
			reply_markup: JSON.stringify({
				remove_keyboard: true,
			}),
		})
		return
	}
	await bot.sendMessage(chatID, "Для начала введи в какой группе по английскому ты находишься (1 - начальная / 2 - средняя / 3 - сильная):", {
		reply_markup: JSON.stringify({
			inline_keyboard: [
				[
					{
						text: "1-я",
						callback_data: JSON.stringify({
							target: "english",
							group: "1",
							chatID: chatID,
						}),
					},
				],
				[
					{
						text: "2-я",
						callback_data: JSON.stringify({
							target: "english",
							group: "2",
							chatID: chatID,
						}),
					},
				],
				[
					{
						text: "3-я",
						callback_data: JSON.stringify({
							target: "english",
							group: "3",
							chatID: chatID,
						}),
					},
				],
			],
		}),
	})
})

bot.onText(/Назад/, async (message) => {
	await getUsersFromDB()
	let chatID = message.chat.id
	if (!(chatID in chats)) {
		await bot.sendMessage(chatID, "Пожалуйста, пропишите /start для началы пользования ботом.", {
			reply_markup: JSON.stringify({
				remove_keyboard: true,
			}),
		})
		return
	}
	await bot.sendMessage(chatID, "Что делаем?", {
		reply_markup: {
			keyboard: chats[chatID].permission_title == "basic" ? menus().basic : menus().extended,
		},
	})
	if (pool[chatID]) {
		resetUserInput(chatID)
	}
})

bot.onText(/Профиль/, async (message) => {
	await getUsersFromDB()
	let chatID = message.chat.id
	if (!(chatID in chats)) {
		await bot.sendMessage(chatID, "Пожалуйста, пропишите /start для началы пользования ботом.", {
			reply_markup: JSON.stringify({
				remove_keyboard: true,
			}),
		})
		return
	}
	await getUsersFromDB()
	await bot.sendMessage(
		chatID,
		`Ваш профиль:\nВыбранная группа по иностранному языку: ${chats[chatID].student_english}${
			chats[chatID].permission_title != "basic" ? "\nВаш уровень прав: " + chats[chatID].permission_title : ""
		}`,
		{
			reply_markup: {
				keyboard: menus().profile,
			},
		}
	)
})

bot.onText(/Настройка получения уведомлений о добавлении нового дз/, async (message) => {
	await getUsersFromDB()
	let chatID = message.chat.id
	if (!(chatID in chats)) {
		await bot.sendMessage(chatID, "Пожалуйста, пропишите /start для началы пользования ботом.", {
			reply_markup: JSON.stringify({
				remove_keyboard: true,
			}),
		})
		return
	}
	await bot.sendMessage(
		chatID,
		`В данный момент получение уведомления о добавлении нового домашнего задания ${
			chats[chatID].student_notification ? "включены." : "выключены."
		}. Что Вы хотите сделать?`,
		{
			reply_markup: {
				keyboard: [["Выключить"], ["Включить"], ["Назад"]],
			},
		}
	)
	if (pool[chatID]) {
		pool[chatID].target = "editNotification"
	} else {
		pool[chatID] = { target: "editNotification" }
	}
})

bot.onText(/Добавить домашнее задание/, async (message) => {
	await getUsersFromDB()
	let chatID = message.chat.id
	if (!(chatID in chats)) {
		await bot.sendMessage(chatID, "Пожалуйста, пропишите /start для началы пользования ботом.", {
			reply_markup: JSON.stringify({
				remove_keyboard: true,
			}),
		})
		return
	}
	if (chats[chatID].permission_title == "basic") return
	await bot.sendMessage(chatID, "По какой дисциплине добавляем дз?", {
		reply_markup: {
			inline_keyboard: menus().homework[chats[chatID].permission_title].add,
		},
	})
})

bot.onText(/Изменить домашнее задание/, async (message) => {
	await getUsersFromDB()
	let chatID = message.chat.id
	if (!(chatID in chats)) {
		await bot.sendMessage(chatID, "Пожалуйста, пропишите /start для началы пользования ботом.", {
			reply_markup: JSON.stringify({
				remove_keyboard: true,
			}),
		})
		return
	}
	if (chats[chatID].permission_title == "basic") return
	await bot.sendMessage(chatID, "Введи айди дз, которое Вы хотите изменить.")
	if (pool[chatID]) {
		pool[chatID].target = "editHomework"
	} else {
		pool[chatID] = { target: "editHomework" }
	}
})

bot.onText(/Удалить домашнее задание/, async (message) => {
	await getUsersFromDB()
	let chatID = message.chat.id
	if (!(chatID in chats)) {
		await bot.sendMessage(chatID, "Пожалуйста, пропишите /start для началы пользования ботом.", {
			reply_markup: JSON.stringify({
				remove_keyboard: true,
			}),
		})
		return
	}
	if (chats[chatID].permission_title == "basic") return
	await bot.sendMessage(chatID, "Введи айди дз, которое Вы хотите удалить.")
	if (pool[chatID]) {
		pool[chatID].target = "deleteHomework"
	} else {
		pool[chatID] = { target: "deleteHomework" }
	}
})

bot.onText(/Действия с админами/, async (message) => {
	await getUsersFromDB()
	let chatID = message.chat.id
	if (!(chatID in chats)) {
		await bot.sendMessage(chatID, "Пожалуйста, пропишите /start для началы пользования ботом.", {
			reply_markup: JSON.stringify({
				remove_keyboard: true,
			}),
		})
		return
	}
	if (chats[chatID].permission_title != "senior") return

	await bot.sendMessage(chatID, "Что делаем?", {
		reply_markup: {
			keyboard: [...menus()[message.text], ["Назад"]],
		},
	})
})

bot.onText(/Изменить права юзеру/, async (message) => {
	let chatID = message.chat.id
	if (!(chatID in chats)) {
		await bot.sendMessage(chatID, "Пожалуйста, пропишите /start для началы пользования ботом.", {
			reply_markup: JSON.stringify({
				remove_keyboard: true,
			}),
		})
		return
	}
	if (chats[chatID].permission_title != "senior") return
	await getUsersFromDB()
	let userList = ""

	for (let user of Object.keys(chats)) {
		userList += `ID: <code>${chats[user].student_id}</code>. Username: @${chats[user].student_nickname}. Premissions: ${chats[user].permission_title}.\n`
	}
	await bot.sendMessage(chatID, `Введите айди пользователя, которому будем менять права.\n${userList}`, { parse_mode: "HTML" })
	if (pool[chatID]) {
		pool[chatID].target = "editPermission"
		pool[chatID].data = message.text
	} else {
		pool[chatID] = {
			target: "editPermission",
			creator: chatID,
			data: message.text,
		}
	}
})
bot.onText(/Ввести новый номер группы/, async (message) => {
	let chatID = message.chat.id
	if (!(chatID in chats)) {
		await bot.sendMessage(chatID, "Пожалуйста, пропишите /start для началы пользования ботом.", {
			reply_markup: JSON.stringify({
				remove_keyboard: true,
			}),
		})
		return
	}
	if (chats[chatID].permission_title != "senior") return
	await getUsersFromDB()
	await bot.sendMessage(chatID, "Пожалуйста, введите новый номер группы.")
	if (pool[chatID]) {
		pool[chatID].target = "editGroupNum"
	} else {
		pool[chatID] = {
			target: "editGroupNum",
			creator: chatID,
		}
	}
})
//!
bot.onText(/Учебники/, async (message) => {
	await getBooksFromDB()
	await getFileFromDB()
	let chatID = message.chat.id
	if (!(chatID in chats)) {
		await bot.sendMessage(chatID, "Пожалуйста, пропишите /start для началы пользования ботом.", {
			reply_markup: JSON.stringify({
				remove_keyboard: true,
			}),
		})
		return
	}
	if (Object.keys(books).length < 1) return await bot.sendMessage(chatID, "Учебников нет.")
	for (let book of Object.keys(books)) {
		await bot.sendDocument(chatID, files[book].file_name, {
			caption: books[book],
			reply_markup: { keyboard: chats[chatID].permission_title == "basic" ? menus().basic : menus().extended },
		})
	}
})

bot.onText(/Редактирование учебников/, async (message) => {
	let chatID = message.chat.id
	await getUsersFromDB()
	if (!(chatID in chats)) {
		await bot.sendMessage(chatID, "Пожалуйста, пропишите /start для началы пользования ботом.", {
			reply_markup: JSON.stringify({
				remove_keyboard: true,
			}),
		})
		return
	}
	if (chats[chatID].permission_title != "senior") return
	await bot.sendMessage(chatID, "Что делаем?", { reply_markup: { keyboard: [["Добавить учебник"], ["Удалить учебник"], ["Изменить учебник"], ["Назад"]] } })
})

bot.onText(/Изменить учебник/, async (message) => {
	let chatID = message.chat.id
	await getUsersFromDB()
	if (!(chatID in chats)) {
		await bot.sendMessage(chatID, "Пожалуйста, пропишите /start для началы пользования ботом.", {
			reply_markup: JSON.stringify({
				remove_keyboard: true,
			}),
		})
		return
	}
	if (chats[chatID].permission_title != "senior") return
	await getBooksFromDB()
	if (Object.keys(books) < 1) return await bot.sendMessage(chatID, "В базе данных отсутствуют учебники для редактирования")
	await bot.sendMessage(chatID, "Введите айди учебника")
	for (let book of Object.keys(books)) {
		await bot.sendDocument(chatID, files[book].file_name, { caption: `${books[book]}\nID: <code>${book}</code>`, parse_mode: "HTML" })
	}
	if (pool[chatID]) {
		pool[chatID].target = "editBooks"
		pool[chatID].data = message.text
	} else {
		pool[chatID] = {
			target: "editBooks",
			data: message.text,
		}
	}
})

bot.onText(/Добавить учебник/, async (message) => {
	let chatID = message.chat.id
	await getUsersFromDB()
	if (!(chatID in chats)) {
		await bot.sendMessage(chatID, "Пожалуйста, пропишите /start для началы пользования ботом.", {
			reply_markup: JSON.stringify({
				remove_keyboard: true,
			}),
		})
		return
	}
	if (chats[chatID].permission_title != "senior") return
	await bot.sendMessage(chatID, "Отправьте документ с названием учебника в одном сообщении")
	if (pool[chatID]) {
		pool[chatID].target = "addBook"
	} else {
		pool[chatID] = {
			target: "addBook",
		}
	}
})

bot.onText(/Удалить учебник/, async (message) => {
	let chatID = message.chat.id
	await getUsersFromDB()
	if (!(chatID in chats)) {
		await bot.sendMessage(chatID, "Пожалуйста, пропишите /start для началы пользования ботом.", {
			reply_markup: JSON.stringify({
				remove_keyboard: true,
			}),
		})
		return
	}
	if (chats[chatID].permission_title != "senior") return
	await getBooksFromDB()
	if (Object.keys(books) < 1) return await bot.sendMessage(chatID, "В базе данных отсутствуют учебники для редактирования")
	await bot.sendMessage(chatID, "Введите айди учебника")
	for (let book of Object.keys(books)) {
		await bot.sendDocument(chatID, files[book].file_name, { caption: `${books[book]}\nID: <code>${book}</code>`, parse_mode: "HTML" })
	}
	if (pool[chatID]) {
		pool[chatID].target = "deleteBook"
	} else {
		pool[chatID] = {
			target: "deleteBook",
		}
	}
})

//!

bot.on("message", async (message) => {
	await getUsersFromDB()
	let chatID = message.chat.id
	try {
		if (!pool[chatID]) return
		if (!(chatID in chats) && message.text != "/start") {
			await bot.sendMessage(chatID, "Пожалуйста, пропишите /start для началы пользования ботом.", {
				reply_markup: {
					remove_keyboard: true,
				},
			})
			return
		}
		if (commands.includes(message.text)) return
		if (message.text == "Назад") return
		if (pool[chatID].target == "editNotification") {
			let messageData = null
			if (message.text == "Выключить") {
				messageData = 0
			} else if (message.text == "Включить") {
				messageData = 1
			}
			if (messageData == null) return
			if (chats[chatID].student_notification != messageData) {
				await db.run("UPDATE student SET student_notification=? WHERE student_id=?", [messageData, chatID], (err) => {
					if (err) {
						console.log("643 line")
						return console.error(err)
					}
					console.log("646 line. Updating student bc notifications")
				})
			}
			await bot.sendMessage(chatID, "Настройка уведомлений прошла успешно.", {
				reply_markup: {
					keyboard: chats[chatID].permission_title == "basic" ? menus().basic : menus().extended,
				},
			})
			if (pool[chatID]) {
				resetUserInput(chatID)
			}
			await getUsersFromDB()
		}
		if (pool[chatID].target == "addHomeworkText") {
			if (message.document) {
				pool[chatID].tempTask.homework_text = message.caption || ""
				pool[chatID].tempTask.homework_files = { arr: [], type: "" }
				pool[chatID].tempTask.homework_files.arr = [message.document.file_id]
				pool[chatID].tempTask.homework_files.type = "document"
				db.run("INSERT INTO file(file_type, file_name) VALUES (?,?)", ["document", message.document.file_id], (err) => {
					if (err) {
						console.log("667 line")
						return console.error(err.message)
					}
					console.log("670 line. Inserting document via adding homework")
				})
			} else if (message.photo) {
				pool[chatID].tempTask.homework_text = message.caption || ""
				pool[chatID].tempTask.homework_files = { arr: [], type: "" }
				pool[chatID].tempTask.homework_files.arr = [message.photo[0].file_id]
				pool[chatID].tempTask.homework_files.type = "photo"
				db.run("INSERT INTO file(file_type, file_name) VALUES (?,?)", ["photo", message.photo[0].file_id], (err) => {
					if (err) {
						console.log("679 line")
						return console.error(err.message)
					}
					console.log("682 line. Inserting photo via adding homework")
				})
			} else {
				pool[chatID].tempTask.homework_text = message.text
			}
			await bot.sendMessage(chatID, "Добавим дедлайн?", {
				reply_markup: {
					inline_keyboard: [
						[
							{
								text: "Да",
								callback_data: JSON.stringify({
									target: "addDeadline",
									data: "yes",
								}),
							},
							{
								text: "Нет",
								callback_data: JSON.stringify({
									target: "addDeadline",
									data: "no",
								}),
							},
						],
					],
				},
			})
		}
		if (pool[chatID].target == "addHomeworkType") {
			await bot.sendMessage(chatID, 'Пожалуйста, выберите "тип" дисциплины, по которой Вы добавляете домашнее задание.')
		}
		if (pool[chatID].target == "addDeadline") {
			try {
				let tempDeadline = message.text.match(/(\d{2})\.(\d{2})\.(\d{4})/)
				pool[chatID].tempTask.homework_deadline = new Date(`${tempDeadline[3]}-${tempDeadline[2]}-${tempDeadline[1]}`)
				pool[chatID].tempTask.homework_creator = chatID

				if (!(pool[chatID].tempTask.homework_deadline > new Date()))
					return await bot.sendMessage(chatID, "Ввод уже прошедшего времени невозможен. Пожалуйста, введите дедлайн корректно.")

				await getUsersFromDB()
				await db.run(
					"INSERT INTO homework(homework_text,homework_lesson,homework_deadline,homework_creator,homework_type,homework_english_group) VALUES (?,?,?,?,?,?)",
					[
						pool[chatID].tempTask.homework_text,
						pool[chatID].tempTask.homework_lesson,
						pool[chatID].tempTask.homework_deadline,
						chatID,
						pool[chatID].tempTask.homework_type,
						pool[chatID].tempTask.homework_lesson == "Иностранный язык" ? chats[chatID].student_english : 0,
					],
					(err) => {
						if (err) {
							console.log("734 line")
							return console.error(err)
						}
						console.log("737 line. Inserting homework via custom deadline")
					}
				)
				await getHomeworkFromDB()
				if (pool[chatID].tempTask.homework_files) {
					db.run(
						"INSERT INTO file(file_type, file_name) VALUES (?,?)",
						[pool[chatID].tempTask.homework_files.type, pool[chatID].tempTask.homework_files.arr[0]],
						(err) => {
							if (err) {
								console.log("747 line")
								return console.error(err.message)
							}
							console.log("750 line. Inserting file via adding homework")
						}
					)
					db.run(
						"INSERT INTO homework_has_file(homework_id,file_id) VALUES((SELECT homework_id FROM homework WHERE homework_text=? AND homework_deadline=? AND homework_lesson=? AND homework_type=? AND homework_creator=?),(SELECT file_id FROM file WHERE file_name=?))",
						[
							pool[chatID].tempTask.homework_text,
							pool[chatID].tempTask.homework_deadline,
							pool[chatID].tempTask.homework_lesson,
							pool[chatID].tempTask.homework_type,
							pool[chatID].tempTask.homework_creator,
							pool[chatID].tempTask.homework_files.arr[0],
						],
						(err) => {
							if (err) {
								console.log("758 line")
								return console.error(err.message)
							}
							console.log("761 line. Inserting link with homework and file")
						}
					)
				}

				await bot.sendMessage(chatID, "Домашка добавлена.", {
					reply_markup: {
						keyboard: chats[chatID].permission_title == "basic" ? menus().basic : menus().extended,
					},
				})
				await getHomeworkFromDB()
				await getHomeworkWithFileFromDB()
				await getFileFromDB()
				for (let chat of Object.keys(chats)) {
					if (
						chats[chat].student_notification &&
						(chats[chat].student_english == pool[chatID].tempTask.homework_english_group ||
							pool[chatID].tempTask.homework_english_group == 0 ||
							chats[chat].permission_title == "senior")
					) {
						try {
							await bot.sendMessage(+chat, "Было добавлено новое домашнее задание:\n")
							let hw = homework[pool[chatID].tempTask.homework_lesson][homework[pool[chatID].tempTask.homework_lesson].length - 1]
							let hwText = `${hw.homework_lesson}\n` + buildHomeworkMessage(hw, chats[chat])
							let filesForSending = []
							if (homeworkWithFiles[hw.homework_id]) {
								for (let fileID of homeworkWithFiles[hw.homework_id]) {
									if (!files[fileID]) return
									filesForSending.push(files[fileID])
								}
							}

							if (filesForSending.length == 0) {
								await bot.sendMessage(chat, hwText, {
									parse_mode: "HTML",
								})
							}

							if (filesForSending.length == 1) {
								if (filesForSending[0].file_type == "document") {
									if (hwText.length <= 1024) {
										await bot.sendDocument(chat, filesForSending[0].file_name, {
											caption: hwText,
											parse_mode: "HTML",
										})
									} else {
										await bot.sendMessage(chat, hwText + "\n&#9660; Документ к дз снизу &#9660;", {
											parse_mode: "HTML",
										})
										await bot.sendDocument(chat, filesForSending[0].file_name)
									}
								}
								if (filesForSending[0].file_type == "photo") {
									if (hwText.length <= 1024) {
										await bot.sendPhoto(chat, filesForSending[0].file_name, {
											caption: hwText,
											parse_mode: "HTML",
										})
									} else {
										await bot.sendMessage(chat, hwText + "\n&#9660; Фото к дз снизу &#9660;", {
											parse_mode: "HTML",
										})
										await bot.sendPhoto(chat, filesForSending[0].file_name)
									}
								}
							}
							if (filesForSending.length > 1) {
								let photos = []
								let docs = []
								let flag = false
								for (let item of filesForSending) {
									if (item.file_type == "document")
										docs.push({
											type: "document",
											media: item.file_name,
										})
									if (item.file_type == "photo")
										photos.push({
											type: "photo",
											media: item.file_name,
										})
								}
								if (photos.length > 0) {
									if (hwText.length <= 990) {
										photos[0].caption = "\n&#9660; Файлы к дз снизу &#9660;\n" + hwText
										photos[0].parse_mode = "HTML"
										await bot.sendMediaGroup(chat, photos)
										flag = true
									} else {
										await bot.sendMessage(chat, hwText, {
											parse_mode: "HTML",
										})
										await bot.sendMediaGroup(chat, photos)
									}
								}
								if (docs.length > 0) {
									if (!flag && hwText.length <= 990) {
										docs[0].caption = hwText
										docs[0].parse_mode = "HTML"
										await bot.sendMediaGroup(chat, docs)
									} else if (flag) {
										docs[0].caption = "&#9650; Файлы к дз, что выше &#9650;"
										docs[0].parse_mode = "HTML"
										await bot.sendMediaGroup(chat, docs)
									}
								}
							}
						} catch (error) {
							if (error.response.body.description == "Bad Request: chat not found") {
								await db.run("DELETE FROM student WHERE student_id=? ", [chat], (err) => {
									if (err) {
										console.log("1640 line")
										return console.error(err)
									}
									console.log("1643 line. Deleting student bc error")
								})
							}
						}
					}
				}
				resetUserInput(chatID)
				resetTempTask(chatID)
			} catch (error) {
				await bot.sendMessage(
					chatID,
					"Дедлайн введен неверно. Проверьте правильность написания дедлайна. Формат: дд.мм.гггг, между данными ставится точка. Либо произошла непредвиденная ошибка"
				)
			}
		}
		if (pool[chatID].target == "editHomework") {
			await bot.sendMessage(chatID, "Что меняем у дз?", {
				reply_markup: {
					inline_keyboard: [
						[
							{
								text: "Текст",
								callback_data: JSON.stringify({
									target: "editTextForHomework",
									taskID: message.text,
								}),
							},
						],
						[
							{
								text: "Дедлайн",
								callback_data: JSON.stringify({
									target: "editDeadlineForHomework",
									taskID: message.text,
								}),
							},
						],
						[
							{
								text: "Добавить Фото/Документ",
								callback_data: JSON.stringify({
									target: "addPhotoDocForHomework",
									taskID: message.text,
								}),
							},
						],
						[
							{
								text: "Удалить Фото/Документ",
								callback_data: JSON.stringify({
									target: "deletePhotoDocForHomework",
									taskID: message.text,
								}),
							},
						],
					],
				},
			})
		}
		if (pool[chatID].target == "rewriteNewText") {
			pool[chatID].taskForEdit.homework_text = message.text
			db.run("UPDATE homework SET homework_text=? WHERE homework_id=?", [message.text, pool[chatID].taskForEdit.homework_id], (err) => {
				if (err) {
					console.log("858 line")
					return console.error(err)
				}
				console.log(`861 line. Updating ${pool[chatID].taskForEdit.homework_id} homework's text`)
			})
			await bot.sendMessage(chatID, "Дз успешно изменено.", {
				reply_markup: {
					keyboard: chats[chatID].permission_title == "basic" ? menus().basic : menus().extended,
				},
			})
			if (pool[chatID]) {
				resetUserInput(chatID)
			}
			await getHomeworkFromDB()
		}
		if (pool[chatID].target == "rewriteNewDeadline") {
			try {
				let tempDeadline = message.text.match(/(\d{2})\.(\d{2})\.(\d{4})/)
				pool[chatID].taskForEdit.homework_deadline = new Date(`${tempDeadline[3]}-${tempDeadline[2]}-${tempDeadline[1]}`)

				if (!(pool[chatID].taskForEdit.homework_deadline > new Date()))
					return await bot.sendMessage(chatID, "Ввод уже прошедшего времени невозможен. Пожалуйста, введите дедлайн корректно.")

				await db.run(
					"UPDATE homework SET homework_deadline=? WHERE homework_id=?",
					[pool[chatID].taskForEdit.homework_deadline, pool[chatID].taskForEdit.homework_id],
					(err) => {
						if (err) {
							console.log("886 line")
							return console.error(err)
						}
						console.log(`889 line. ${chatID} Updating ${pool[chatID].taskForEdit.homework_id} homework's deadline`)
					}
				)
				await bot.sendMessage(chatID, "Дз успешно изменено.", {
					reply_markup: {
						keyboard: chats[chatID].permission_title == "basic" ? menus().basic : menus().extended,
					},
				})
				if (pool[chatID]) {
					resetUserInput(chatID)
				}
				await getHomeworkFromDB()
			} catch (error) {
				await bot.sendMessage(
					chatID,
					"Дедлайн введен неверно. Проверьте правильность написания дедлайна. Формат: дд.мм.гггг, между данными ставится точка."
				)
			}
		}
		if (pool[chatID].target == "deleteHomework") {
			await getHomeworkFromDB()
			await getUsersFromDB()

			let homeworkLessons = Object.keys(homework)
			let isHomeworkHaveFound = false
			homeworkLessons.forEach((lesson) => {
				for (let i = 0; i < homework[lesson].length; i++) {
					if (
						homework[lesson][i].homework_id == message.text &&
						(homework[lesson][i].homework_creator == chatID || chats[chatID].permission_title == "senior") &&
						lesson in menus().permissions[chats[chatID].permission_title]
					)
						return (isHomeworkHaveFound = true)
				}
			})

			if (isHomeworkHaveFound) {
				await db.run("DELETE FROM homework WHERE homework_id = ?", [message.text], (err) => {
					if (err) {
						console.log("928 line")
						return console.error(err)
					}
					console.log(`931 line. ${chatID} Deleting ${message.text} homework`)
				})
				await bot.sendMessage(chatID, "Дз успешно удалено.", {
					reply_markup: {
						keyboard: chats[chatID].permission_title == "basic" ? menus().basic : menus().extended,
					},
				})
				await getHomeworkFromDB()

				if (pool[chatID]) {
					resetUserInput(chatID)
				}
			} else {
				await bot.sendMessage(chatID, "Дз не было найдено либо у Вас нет к нему доступа.", {
					reply_markup: {
						keyboard: chats[chatID].permission_title == "basic" ? menus().basic : menus().extended,
					},
				})
				if (pool[chatID]) {
					resetUserInput(chatID)
				}
			}
		}
		if (pool[chatID].target == "editPermission") {
			if (!pool[chatID].data) return
			await getPermissionFromDB()

			let temp = []
			for (let item of permission) {
				temp.push([
					{
						text: item.permission_title,
						callback_data: JSON.stringify({
							target: "editPermission",
							permission: item.permission_id,
							user: message.text,
						}),
					},
				])
			}
			await bot.sendMessage(chatID, "Какой уровень прав установить пользователю?", {
				reply_markup: {
					inline_keyboard: temp,
				},
			})
			if (pool[chatID]) {
				resetUserInput(chatID)
			}
		}
		if (pool[chatID].target == "deletePhotoDocForHomework") {
			let fileID = message.text
			if (!files[fileID]) await bot.sendMessage(chatID, "Такого файла не существует. Попробуйте ещё раз.")
			db.run("DELETE FROM file WHERE file_id=?", [fileID], (err) => {
				if (err) {
					console.log("985 line")
					return console.error(err.message)
				}
				console.log(`988 line. ${chatID} Deleting file`)
			})
			db.run("DELETE FROM homework_has_file WHERE file_id=?", [fileID], (err) => {
				if (err) {
					console.log("992 line")
					return console.error(err.message)
				}
				console.log(`995 line. ${chatID} Deleting link with file and homework `)
			})
			await bot.sendMessage(chatID, "Документ был успешно удалён.")
			resetUserInput(chatID)
			await getFileFromDB()
		}
		if (pool[chatID].target == "addPhotoDocForHomework") {
			if (!pool[chatID].taskForEdit) return await bot.sendMessage(chatID, "Что-то пошло не так. Попробуйте ещё раз.")
			if (message.document) {
				db.run("INSERT INTO file(file_type, file_name) VALUES (?,?)", ["document", message.document.file_id], (err) => {
					if (err) {
						console.log("1006 line")
						return console.error(err.message)
					}
					console.log(`1009 line. ${chatID} Adding document`)
				})
				db.run(
					"INSERT INTO homework_has_file(homework_id,file_id) VALUES (?,(SELECT file_id FROM file WHERE file_name=?))",
					[pool[chatID].taskForEdit.homework_id, message.document.file_id],
					(err) => {
						if (err) {
							console.log("1016 line")
							return console.error(err.message)
						}
						console.log(`1019 line. ${chatID} Adding link with file and ${pool[chatID].taskForEdit.homework_id} homework`)
					}
				)
			} else if (message.photo) {
				db.run("INSERT INTO file(file_type, file_name) VALUES (?,?)", ["photo", message.photo[0].file_id], (err) => {
					if (err) {
						console.log("1025 line")
						return console.error(err.message)
					}
					console.log(`1028 line. ${chatID} Adding photo`)
				})
				db.run(
					"INSERT INTO homework_has_file(homework_id,file_id) VALUES (?,(SELECT file_id FROM file WHERE file_name=?))",
					[pool[chatID].taskForEdit.homework_id, message.photo[0].file_id],
					(err) => {
						if (err) {
							console.log("1035 line")
							return console.error(err.message)
						}
						console.log(`1038 line. ${chatID} Adding link with file and ${pool[chatID].taskForEdit.homework_id} homework`)
					}
				)
			}
			await bot.sendMessage(chatID, "Документ был успешно добавлен.")
			resetUserInput(chatID)
			await getFileFromDB()
		}
		if (pool[chatID].target == "editGroupNum") {
			groupNum = message.text
			await bot.sendMessage(chatID, "Группа успешно изменена.", {
				reply_markup: {
					keyboard: chats[chatID].permission_title == "basic" ? menus().basic : menus().extended,
				},
			})
		}
		//!
		if (pool[chatID].target == "editBooks") {
			await bot.sendMessage(chatID, "Что меняем у учебника?", {
				reply_markup: {
					inline_keyboard: [
						[
							{
								text: "Название",
								callback_data: JSON.stringify({
									target: "editBookForTitle",
									data: message.text,
								}),
							},
						],
					],
				},
			})
			resetUserInput(chatID)
		}
		if (pool[chatID].target == "rewriteNewTitleForBook") {
			let bookNewTitle = message.text
			db.run("UPDATE book SET book_name=? WHERE file_id=?", [bookNewTitle, pool[chatID].data.bookID], (err) => {
				if (err) {
					console.log("1137 line")
					return console.error(err)
				}
			})
			await bot.sendMessage(chatID, "Учебник успешно изменен", {
				reply_markup: {
					keyboard: chats[chatID].permission_title == "basic" ? menus().basic : menus().extended,
				},
			})
		}
		if (pool[chatID].target == "addBook") {
			db.run("INSERT INTO file(file_type, file_name) VALUES (?,?)", ["document", message.document?.file_id], (err) => {
				if (err) {
					console.log("1161 line.")
					console.error(err)
				}
			})
			db.run(
				"INSERT INTO book(book_name,file_id) VALUES (?,(SELECT file_id FROM file WHERE file_name=?))",
				[message.caption || "", message.document?.file_id],
				(err) => {
					if (err) {
						console.log("1167 line.")
						console.error(err)
					}
				}
			)
			await bot.sendMessage(chatID, "Учебник успешно добавлен", {
				reply_markup: {
					keyboard: chats[chatID].permission_title == "basic" ? menus().basic : menus().extended,
				},
			})
			resetUserInput(chatID)
		}
		if (pool[chatID].target == "deleteBook") {
			db.run("delete from book where file_id=?", [message.text], (err) => {
				if (err) {
					console.log("1204 line")
					return console.error(err)
				}
			})
			db.run("delete from file where file_id=?", [message.text], (err) => {
				if (err) {
					console.log("1204 line")
					return console.error(err)
				}
			})
			resetUserInput(chatID)
			await getBooksFromDB()
			await getFileFromDB()
			await bot.sendMessage(chatID, "Учебник успешно удален", {
				reply_markup: {
					keyboard: chats[chatID].permission_title == "basic" ? menus().basic : menus().extended,
				},
			})
		}
		//!
	} catch (err) {
		console.log("1047 line")
		console.error(err)
	}
})

bot.on("callback_query", async (message) => {
	await getUsersFromDB()
	await getHomeworkFromDB()
	await getFileFromDB()
	await getHomeworkWithFileFromDB()
	let chatID = message.message.chat.id

	if (!(chatID in chats)) {
		await bot.sendMessage(chatID, "Пожалуйста, пропишите /start для началы пользования ботом.", {
			reply_markup: JSON.stringify({
				remove_keyboard: true,
			}),
		})
		bot.answerCallbackQuery(message.id)
		return
	}
	let data = JSON.parse(message.data)
	if (data.target == "homework") {
		if (data.lesson == "Всё") {
			let actualHomework = getHomeworkArray(homework, 0, { mode: "ahead" })
			if (!(Object.keys(actualHomework).length > 0)) await bot.sendMessage(chatID, `Домашнее задание отсутствует.`)

			for (let lesson of Object.keys(actualHomework)) {
				if (lesson == "Иностранный язык") {
					let tempArray = []
					if (!actualHomework[lesson]) return
					for (let item of actualHomework[lesson]) {
						if (item.homework_english_group == chats[chatID].student_english) {
							tempArray.push(item)
						}
					}
					actualHomework[lesson] = tempArray
				}
				if (Object.keys(actualHomework).length == 1 && actualHomework[lesson] && lesson == "Иностранный язык") {
					bot.answerCallbackQuery(message.id)
					return await bot.sendMessage(chatID, `Домашнее задание отсутствует.`)
				}
				if (actualHomework[lesson].length < 1) continue

				await bot.sendMessage(chatID, `Дз по дисциплине "<u>${lesson}</u>":`, {
					parse_mode: "HTML",
				})

				for (let hw of actualHomework[lesson]) {
					if (
						!(
							chats[chatID].student_english == hw.homework_english_group ||
							hw.homework_english_group == 0 ||
							chats[chatID].permission_title == "senior"
						)
					)
						continue
					let hwText = buildHomeworkMessage(hw, chats[chatID])

					let filesForSending = []
					if (homeworkWithFiles[hw.homework_id]) {
						for (let fileID of homeworkWithFiles[hw.homework_id]) {
							if (!files[fileID]) return
							filesForSending.push(files[fileID])
						}
					}
					if (filesForSending.length == 0) {
						await bot.sendMessage(chatID, hwText, {
							parse_mode: "HTML",
						})
					}
					if (filesForSending.length == 1) {
						if (filesForSending[0].file_type == "document") {
							if (hwText.length <= 1024) {
								await bot.sendDocument(chatID, filesForSending[0].file_name, {
									caption: hwText,
									parse_mode: "HTML",
								})
							} else {
								await bot.sendMessage(chatID, hwText + "\n&#9660; Документ к дз снизу &#9660;", {
									parse_mode: "HTML",
								})
								await bot.sendDocument(chatID, filesForSending[0].file_name)
							}
						}
						if (filesForSending[0].file_type == "photo") {
							if (hwText.length <= 1024) {
								await bot.sendPhoto(chatID, filesForSending[0].file_name, {
									caption: hwText,
									parse_mode: "HTML",
								})
							} else {
								await bot.sendMessage(chatID, hwText + "\n&#9660; Фото к дз снизу &#9660;", {
									parse_mode: "HTML",
								})
								await bot.sendPhoto(chatID, filesForSending[0].file_name)
							}
						}
					}
					if (filesForSending.length > 1) {
						let photos = []
						let docs = []
						let flag = false
						for (let item of filesForSending) {
							if (item.file_type == "document")
								docs.push({
									type: "document",
									media: item.file_name,
								})
							if (item.file_type == "photo")
								photos.push({
									type: "photo",
									media: item.file_name,
								})
						}
						if (photos.length > 0) {
							if (hwText.length <= 990) {
								photos[0].caption = "\n&#9660; Файлы к дз снизу &#9660;\n" + hwText
								photos[0].parse_mode = "HTML"
								await bot.sendMediaGroup(chatID, photos)
								flag = true
							} else {
								await bot.sendMessage(chatID, hwText, {
									parse_mode: "HTML",
								})
								await bot.sendMediaGroup(chatID, photos)
							}
						}
						if (docs.length > 0) {
							if (!flag && hwText.length <= 990) {
								docs[0].caption = hwText
								docs[0].parse_mode = "HTML"
								await bot.sendMediaGroup(chatID, docs)
							} else if (flag) {
								docs[0].caption = "&#9650; Файлы к дз, что выше &#9650;"
								docs[0].parse_mode = "HTML"
								await bot.sendMediaGroup(chatID, docs)
							}
						}
					}
				}
			}
			bot.answerCallbackQuery(message.id)
		} else if (data.lesson == "Завтра") {
			let homeworkForTomorrow = getHomeworkForTomorrow(homework)
			if (!(Object.keys(homeworkForTomorrow).length > 0)) await bot.sendMessage(chatID, `Дз на завтра отсутствует.`)

			for (let lesson of Object.keys(homeworkForTomorrow)) {
				if (lesson == "Иностранный язык") {
					if (!homeworkForTomorrow[lesson]) return
					let tempArray = []
					for (let item of homeworkForTomorrow[lesson]) {
						if (item.homework_english_group == chats[chatID].student_english) {
							tempArray.push(item)
						}
					}
					homeworkForTomorrow[lesson] = tempArray
				}
				if (Object.keys(homeworkForTomorrow).length == 1 && homeworkForTomorrow[lesson] && lesson == "Иностранный язык") {
					bot.answerCallbackQuery(message.id)
					return await bot.sendMessage(chatID, `Дз на завтра отсутствует.`)
				}

				if (homeworkForTomorrow[lesson].length < 1) continue

				await bot.sendMessage(chatID, `Дз по дисциплине "<u>${lesson}</u>":`, {
					parse_mode: "HTML",
				})

				for (let hw of homeworkForTomorrow[lesson]) {
					if (
						!(
							chats[chatID].student_english == hw.homework_english_group ||
							hw.homework_english_group == 0 ||
							chats[chatID].permission_title == "senior"
						)
					)
						continue
					let hwText = buildHomeworkMessage(hw, chats[chatID])

					let filesForSending = []
					if (homeworkWithFiles[hw.homework_id]) {
						for (let fileID of homeworkWithFiles[hw.homework_id]) {
							if (!files[fileID]) return
							filesForSending.push(files[fileID])
						}
					}
					if (filesForSending.length == 0) {
						await bot.sendMessage(chatID, hwText, {
							parse_mode: "HTML",
						})
					}
					if (filesForSending.length == 1) {
						if (filesForSending[0].file_type == "document") {
							if (hwText.length <= 1024) {
								await bot.sendDocument(chatID, filesForSending[0].file_name, {
									caption: hwText,
									parse_mode: "HTML",
								})
							} else {
								await bot.sendMessage(chatID, hwText + "\n&#9660; Документ к дз снизу &#9660;", {
									parse_mode: "HTML",
								})
								await bot.sendDocument(chatID, filesForSending[0].file_name)
							}
						}
						if (filesForSending[0].file_type == "photo") {
							if (hwText.length <= 1024) {
								await bot.sendPhoto(chatID, filesForSending[0].file_name, {
									caption: hwText,
									parse_mode: "HTML",
								})
							} else {
								await bot.sendMessage(chatID, hwText + "\n&#9660; Фото к дз снизу &#9660;", {
									parse_mode: "HTML",
								})
								await bot.sendPhoto(chatID, filesForSending[0].file_name)
							}
						}
					}
					if (filesForSending.length > 1) {
						let photos = []
						let docs = []
						let flag = false
						for (let item of filesForSending) {
							if (item.file_type == "document")
								docs.push({
									type: "document",
									media: item.file_name,
								})
							if (item.file_type == "photo")
								photos.push({
									type: "photo",
									media: item.file_name,
								})
						}
						if (photos.length > 0) {
							if (hwText.length <= 990) {
								photos[0].caption = "\n&#9660; Файлы к дз снизу &#9660;\n" + hwText
								photos[0].parse_mode = "HTML"
								await bot.sendMediaGroup(chatID, photos)
								flag = true
							} else {
								await bot.sendMessage(chatID, hwText, {
									parse_mode: "HTML",
								})
								await bot.sendMediaGroup(chatID, photos)
							}
						}
						if (docs.length > 0) {
							if (!flag && hwText.length <= 990) {
								docs[0].caption = hwText
								docs[0].parse_mode = "HTML"
								await bot.sendMediaGroup(chatID, docs)
							} else if (flag) {
								docs[0].caption = "&#9650; Файлы к дз, что выше &#9650;"
								docs[0].parse_mode = "HTML"
								await bot.sendMediaGroup(chatID, docs)
							}
						}
					}
				}
			}
			bot.answerCallbackQuery(message.id)
		} else if (data.lesson == "Архив") {
			let archiveHomework = getHomeworkArray(homework, 1, { mode: "overdue" })

			if (!(Object.keys(archiveHomework).length > 0)) await bot.sendMessage(chatID, `Домашнее задание отсутствует.`)

			for (let lesson of Object.keys(archiveHomework)) {
				if (lesson == "Иностранный язык") {
					let tempArray = []
					if (!archiveHomework[lesson]) return
					for (let item of archiveHomework[lesson]) {
						if (item.homework_english_group == chats[chatID].student_english) {
							tempArray.push(item)
						}
					}
					archiveHomework[lesson] = tempArray
				}

				if (Object.keys(archiveHomework).length == 1 && archiveHomework[lesson] && lesson == "Иностранный язык") {
					bot.answerCallbackQuery(message.id)
					return await bot.sendMessage(chatID, `Домашнее задание отсутствует.`)
				}

				if (archiveHomework[lesson].length < 1) continue

				await bot.sendMessage(chatID, `Дз по дисциплине "<u>${lesson}</u>":`, {
					parse_mode: "HTML",
				})

				for (let hw of archiveHomework[lesson]) {
					if (
						!(
							chats[chatID].student_english == hw.homework_english_group ||
							hw.homework_english_group == 0 ||
							chats[chatID].permission_title == "senior"
						)
					)
						continue
					let hwText = buildHomeworkMessage(hw, chats[chatID])

					let filesForSending = []
					if (homeworkWithFiles[hw.homework_id]) {
						for (let fileID of homeworkWithFiles[hw.homework_id]) {
							if (!files[fileID]) return
							filesForSending.push(files[fileID])
						}
					}
					if (filesForSending.length == 0) {
						await bot.sendMessage(chatID, hwText, {
							parse_mode: "HTML",
						})
					}
					if (filesForSending.length == 1) {
						if (filesForSending[0].file_type == "document") {
							if (hwText.length <= 1024) {
								await bot.sendDocument(chatID, filesForSending[0].file_name, {
									caption: hwText,
									parse_mode: "HTML",
								})
							} else {
								await bot.sendMessage(chatID, hwText + "\n&#9660; Документ к дз снизу &#9660;", {
									parse_mode: "HTML",
								})
								await bot.sendDocument(chatID, filesForSending[0].file_name)
							}
						}
						if (filesForSending[0].file_type == "photo") {
							if (hwText.length <= 1024) {
								await bot.sendPhoto(chatID, filesForSending[0].file_name, {
									caption: hwText,
									parse_mode: "HTML",
								})
							} else {
								await bot.sendMessage(chatID, hwText + "\n&#9660; Фото к дз снизу &#9660;", {
									parse_mode: "HTML",
								})
								await bot.sendPhoto(chatID, filesForSending[0].file_name)
							}
						}
					}
					if (filesForSending.length > 1) {
						let photos = []
						let docs = []
						let flag = false
						for (let item of filesForSending) {
							if (item.file_type == "document")
								docs.push({
									type: "document",
									media: item.file_name,
								})
							if (item.file_type == "photo")
								photos.push({
									type: "photo",
									media: item.file_name,
								})
						}
						if (photos.length > 0) {
							if (hwText.length <= 990) {
								photos[0].caption = "\n&#9660; Файлы к дз снизу &#9660;\n" + hwText
								photos[0].parse_mode = "HTML"
								await bot.sendMediaGroup(chatID, photos)
								flag = true
							} else {
								await bot.sendMessage(chatID, hwText, {
									parse_mode: "HTML",
								})
								await bot.sendMediaGroup(chatID, photos)
							}
						}
						if (docs.length > 0) {
							if (!flag && hwText.length <= 990) {
								docs[0].caption = hwText
								docs[0].parse_mode = "HTML"
								await bot.sendMediaGroup(chatID, docs)
							} else if (flag) {
								docs[0].caption = "&#9650; Файлы к дз, что выше &#9650;"
								docs[0].parse_mode = "HTML"
								await bot.sendMediaGroup(chatID, docs)
							}
						}
					}
				}
			}
			bot.answerCallbackQuery(message.id)
		} else {
			let actualHomework = getHomeworkArray(homework, 0, { mode: "ahead" })
			if (Object.keys(lessons)[data.lesson] == "Иностранный язык") {
				let tempArray = []
				if (!actualHomework[Object.keys(lessons)[data.lesson]]) {
					bot.answerCallbackQuery(message.id)
					return await bot.sendMessage(chatID, `Дз по дисциплине "${Object.keys(lessons)[data.lesson]}" нет`)
				}
				for (let item of actualHomework[Object.keys(lessons)[data.lesson]]) {
					if (item.homework_english_group == chats[chatID].student_english) {
						tempArray.push(item)
					}
				}
				actualHomework[Object.keys(lessons)[data.lesson]] = tempArray
			}

			if (!(actualHomework[Object.keys(lessons)[data.lesson]]?.length > 0)) {
				bot.answerCallbackQuery(message.id)
				return await bot.sendMessage(chatID, `Дз по дисциплине "${Object.keys(lessons)[data.lesson]}" нет`)
			}

			await bot.sendMessage(chatID, `Дз по дисциплине "<u>${Object.keys(lessons)[data.lesson]}</u>":`, { parse_mode: "HTML" })
			for (let hw of actualHomework[Object.keys(lessons)[data.lesson]]) {
				if (
					!(
						chats[chatID].student_english == hw.homework_english_group ||
						hw.homework_english_group == 0 ||
						chats[chatID].permission_title == "senior"
					)
				)
					continue
				let hwText = buildHomeworkMessage(hw, chats[chatID])

				let filesForSending = []
				if (homeworkWithFiles[hw.homework_id]) {
					for (let fileID of homeworkWithFiles[hw.homework_id]) {
						if (!files[fileID]) return
						filesForSending.push(files[fileID])
					}
				}
				if (filesForSending.length == 0) {
					await bot.sendMessage(chatID, hwText, {
						parse_mode: "HTML",
					})
				}
				if (filesForSending.length == 1) {
					if (filesForSending[0].file_type == "document") {
						if (hwText.length <= 1024) {
							await bot.sendDocument(chatID, filesForSending[0].file_name, {
								caption: hwText,
								parse_mode: "HTML",
							})
						} else {
							await bot.sendMessage(chatID, hwText + "\n&#9660; Документ к дз снизу &#9660;", {
								parse_mode: "HTML",
							})
							await bot.sendDocument(chatID, filesForSending[0].file_name)
						}
					}
					if (filesForSending[0].file_type == "photo") {
						if (hwText.length <= 1024) {
							await bot.sendPhoto(chatID, filesForSending[0].file_name, {
								caption: hwText,
								parse_mode: "HTML",
							})
						} else {
							await bot.sendMessage(chatID, hwText + "\n&#9660; Фото к дз снизу &#9660;", {
								parse_mode: "HTML",
							})
							await bot.sendPhoto(chatID, filesForSending[0].file_name)
						}
					}
				}
				if (filesForSending.length > 1) {
					let photos = []
					let docs = []
					let flag = false
					for (let item of filesForSending) {
						if (item.file_type == "document")
							docs.push({
								type: "document",
								media: item.file_name,
							})
						if (item.file_type == "photo")
							photos.push({
								type: "photo",
								media: item.file_name,
							})
					}
					if (photos.length > 0) {
						if (hwText.length <= 990) {
							photos[0].caption = "\n&#9660; Файлы к дз снизу &#9660;\n" + hwText
							photos[0].parse_mode = "HTML"
							await bot.sendMediaGroup(chatID, photos)
							flag = true
						} else {
							await bot.sendMessage(chatID, hwText, {
								parse_mode: "HTML",
							})
							await bot.sendMediaGroup(chatID, photos)
						}
					}
					if (docs.length > 0) {
						if (!flag && hwText.length <= 990) {
							docs[0].caption = hwText
							docs[0].parse_mode = "HTML"
							await bot.sendMediaGroup(chatID, docs)
						} else if (flag) {
							docs[0].caption = "&#9650; Файлы к дз, что выше &#9650;"
							docs[0].parse_mode = "HTML"
							await bot.sendMediaGroup(chatID, docs)
						}
					}
				}
			}

			bot.answerCallbackQuery(message.id)
		}
	}
	if (data.target == "english") {
		db.run("UPDATE student SET student_english = ? WHERE student_id = ?", [data.group, data.chatID], (err) => {
			if (err) {
				console.log("1386 line")
				return console.error(err)
			}
			console.log(`1389 line. ${chatID} Updating student english group`)
		})
		chats[data.chatID] = { ...chats[data.chatID], english: data.group }
		await bot.sendMessage(data.chatID, "Отлично! Приятного пользования ботом.", {
			reply_markup: {
				keyboard: [["Профиль"], ["Посмотреть дз"], ["Разное"]],
			},
		})
		bot.answerCallbackQuery(message.id)
	}
	if (data.target == "addHomeworkText") {
		if (chats[chatID].permission_title == "basic") return
		if (pool[chatID] == undefined) return

		if (!pool[chatID]?.tempTask?.homework_lesson) {
			bot.answerCallbackQuery(message.id)
			return await bot.sendMessage(chatID, "Домашнее задание заполнено некорректно. Начните сначала.")
		}
		if (!(pool[chatID]?.tempTask?.homework_lesson in menus().permissions[chats[chatID].permission_title])) {
			bot.answerCallbackQuery(message.id)
			return await bot.sendMessage(chatID, "У Вас нет доступа к добавлению дз по этой дисциплине.", {
				reply_markup: {
					keyboard: chats[chatID].permission_title == "basic" ? menus().basic : menus().extended,
				},
			})
		}
		await bot.sendMessage(chatID, `Что задали по дисциплине "${pool[chatID].tempTask.homework_lesson}"?`)
		pool[chatID].tempTask.homework_type = lessons[pool[chatID].tempTask.homework_lesson][data.lesson]
		bot.answerCallbackQuery(message.id)
		pool[chatID].target = "addHomeworkText"
	}
	if (data.target == "addHomeworkType") {
		pool[chatID] = { tempTask: {} }
		if (!pool[chatID]?.tempTask?.homework_lesson) {
			let lessonID = data.lesson
			pool[chatID].tempTask.homework_lesson = Object.keys(lessons)[lessonID]
		}

		if (Object.keys(lessons).indexOf(pool[chatID].tempTask.homework_lesson) != data.lesson && !data.isSettedType) {
			if (pool[chatID]) {
				resetTempTask(chatID)
			}
			let lessonID = data.lesson
			pool[chatID].tempTask.homework_lesson = Object.keys(lessons)[lessonID]
		}

		if (!(pool[chatID]?.tempTask?.homework_lesson in menus().permissions[chats[chatID].permission_title])) {
			bot.answerCallbackQuery(message.id)
			return await bot.sendMessage(chatID, "У Вас нет доступа к добавлению дз по этой дисциплине.", {
				reply_markup: {
					keyboard: chats[chatID].permission == "basic" ? menus().basic : menus().extended,
				},
			})
		}
		await bot.sendMessage(chatID, `Добавление дз для какого "типа" дисциплины "${pool[chatID].tempTask.homework_lesson}"?`, {
			reply_markup: JSON.stringify({
				inline_keyboard: parseLessonsForOptions(lessons[pool[chatID].tempTask.homework_lesson], 1, "addHomeworkText", [], { isSettedType: true }),
			}),
		})
		if (pool[chatID]) {
			pool[chatID].target = "addHomeworkType"
		} else {
			pool[chatID] = { target: "addHomeworkType" }
		}
		bot.answerCallbackQuery(message.id)
	}
	if (data.target == "addDeadline") {
		if (chats[chatID].permission_title == "basic") return
		if (
			!(
				(pool[chatID]?.tempTask?.homework_text || pool[chatID]?.tempTask?.homework_files) &&
				pool[chatID].tempTask.homework_lesson &&
				pool[chatID].tempTask.homework_type
			)
		) {
			return await bot.sendMessage(chatID, "Домашнее задание заполнено некорректно. Начните сначала.")
		}

		if (!(pool[chatID]?.tempTask?.homework_lesson in menus().permissions[chats[chatID].permission_title])) {
			bot.answerCallbackQuery(message.id)
			return await bot.sendMessage(chatID, "У Вас нет доступа к добавлению дз по этой дисциплине.", {
				reply_markup: {
					keyboard: chats[chatID].permission == "basic" ? menus().basic : menus().extended,
				},
			})
		}

		if (data.data == "yes") {
			if (pool[chatID]) {
				pool[chatID].target = "addDeadline"
			} else {
				pool[chatID] = { target: "addDeadline" }
			}
			await bot.sendMessage(
				chatID,
				"Какой дедлайн у домашки? (Ответ требует формата дд.мм.гггг, например 01.01.1970. Обратите внимание на кол-во дней в месяце, чтобы домашка установилась правильно)"
			)
			bot.answerCallbackQuery(message.id)
		} else {
			await getUsersFromDB()
			pool[chatID].tempTask.homework_english_group = pool[chatID].tempTask.homework_lesson == "Иностранный язык" ? chats[chatID].student_english : 0
			pool[chatID].tempTask.homework_creator = chatID
			pool[chatID].tempTask.homework_deadline = 0
			setDeadline(parseLessonsForDays(APIData), pool[chatID].tempTask, getEvennessOfWeek())
			await db.run(
				"INSERT INTO homework(homework_text,homework_lesson,homework_deadline,homework_creator,homework_type,homework_english_group) VALUES (?,?,?,?,?,?)",
				[
					pool[chatID].tempTask.homework_text,
					pool[chatID].tempTask.homework_lesson,
					pool[chatID].tempTask.homework_deadline,
					chatID,
					pool[chatID].tempTask.homework_type,
					pool[chatID].tempTask.homework_lesson == "Иностранный язык" ? chats[chatID].student_english : 0,
				],
				(err) => {
					if (err) {
						console.log("1500 line")
						return console.error(err)
					}
					console.log(`1503 line. ${chatID} Inserting homework`)
				}
			)
			console.log(pool[chatID].tempTask)
			if (pool[chatID].tempTask.homework_files) {
				console.log(1807)
				db.run(
					"INSERT INTO file(file_type, file_name) VALUES (?,?)",
					[pool[chatID].tempTask.homework_files.type, pool[chatID].tempTask.homework_files.arr[0]],
					(err) => {
						if (err) {
							console.log("1513 line")
							return console.error(err.message)
						}
						console.log(`1516 line. ${chatID} Inserting file`)
					}
				)
				db.run(
					"INSERT INTO homework_has_file(homework_id,file_id) VALUES((SELECT homework_id FROM homework WHERE homework_text=? AND homework_deadline=? AND homework_lesson=? AND homework_type=? AND homework_creator=?),(SELECT file_id FROM file WHERE file_name=?))",
					[
						pool[chatID].tempTask.homework_text,
						pool[chatID].tempTask.homework_deadline,
						pool[chatID].tempTask.homework_lesson,
						pool[chatID].tempTask.homework_type,
						pool[chatID].tempTask.homework_creator,
						pool[chatID].tempTask.homework_files.arr[0],
					],
					(err) => {
						if (err) {
							console.log("1524 line")
							return console.error(err.message)
						}
						console.log(`1527 line. ${chatID} Inserting link with file and homework`)
					}
				)
			}

			await bot.sendMessage(chatID, "Домашка добавлена.", {
				reply_markup: {
					keyboard: menus()[chats[chatID].permission_title],
				},
			})
			await getHomeworkFromDB()
			await getHomeworkWithFileFromDB()
			await getFileFromDB()
			for (let chat of Object.keys(chats)) {
				if (
					chats[chat].student_notification &&
					(chats[chat].student_english == pool[chatID].tempTask.homework_english_group ||
						pool[chatID].tempTask.homework_english_group == 0 ||
						chats[chat].permission_title == "senior")
				) {
					try {
						await bot.sendMessage(+chat, "Было добавлено новое домашнее задание:\n")
						let hw = homework[pool[chatID].tempTask.homework_lesson][homework[pool[chatID].tempTask.homework_lesson].length - 1]
						let hwText = `${hw.homework_lesson}\n` + buildHomeworkMessage(hw, chats[chat])
						let filesForSending = []
						if (homeworkWithFiles[hw.homework_id]) {
							for (let fileID of homeworkWithFiles[hw.homework_id]) {
								if (!files[fileID]) return
								filesForSending.push(files[fileID])
							}
						}

						if (filesForSending.length == 0) {
							await bot.sendMessage(chat, hwText, {
								parse_mode: "HTML",
							})
						}

						if (filesForSending.length == 1) {
							if (filesForSending[0].file_type == "document") {
								if (hwText.length <= 1024) {
									await bot.sendDocument(chat, filesForSending[0].file_name, {
										caption: hwText,
										parse_mode: "HTML",
									})
								} else {
									await bot.sendMessage(chat, hwText + "\n&#9660; Документ к дз снизу &#9660;", {
										parse_mode: "HTML",
									})
									await bot.sendDocument(chat, filesForSending[0].file_name)
								}
							}
							if (filesForSending[0].file_type == "photo") {
								if (hwText.length <= 1024) {
									await bot.sendPhoto(chat, filesForSending[0].file_name, {
										caption: hwText,
										parse_mode: "HTML",
									})
								} else {
									await bot.sendMessage(chat, hwText + "\n&#9660; Фото к дз снизу &#9660;", {
										parse_mode: "HTML",
									})
									await bot.sendPhoto(chat, filesForSending[0].file_name)
								}
							}
						}
						if (filesForSending.length > 1) {
							let photos = []
							let docs = []
							let flag = false
							for (let item of filesForSending) {
								if (item.file_type == "document")
									docs.push({
										type: "document",
										media: item.file_name,
									})
								if (item.file_type == "photo")
									photos.push({
										type: "photo",
										media: item.file_name,
									})
							}
							if (photos.length > 0) {
								if (hwText.length <= 990) {
									photos[0].caption = "\n&#9660; Файлы к дз снизу &#9660;\n" + hwText
									photos[0].parse_mode = "HTML"
									await bot.sendMediaGroup(chat, photos)
									flag = true
								} else {
									await bot.sendMessage(chat, hwText, {
										parse_mode: "HTML",
									})
									await bot.sendMediaGroup(chat, photos)
								}
							}
							if (docs.length > 0) {
								if (!flag && hwText.length <= 990) {
									docs[0].caption = hwText
									docs[0].parse_mode = "HTML"
									await bot.sendMediaGroup(chat, docs)
								} else if (flag) {
									docs[0].caption = "&#9650; Файлы к дз, что выше &#9650;"
									docs[0].parse_mode = "HTML"
									await bot.sendMediaGroup(chat, docs)
								}
							}
						}
					} catch (error) {
						if (error.response.body.description == "Bad Request: chat not found") {
							await db.run("DELETE FROM student WHERE student_id=? ", [chat], (err) => {
								if (err) {
									console.log("1640 line")
									return console.error(err)
								}
								console.log("1643 line. Deleting student bc error")
							})
						}
					}
				}
			}

			resetUserInput(chatID)
			resetTempTask(chatID)
			bot.answerCallbackQuery(message.id)
		}
	}
	if (data.target == "editTextForHomework") {
		if (chats[chatID].permission_title == "basic") return
		let taskForEdit = null

		for (let key of Object.keys(homework)) {
			homework[key].forEach(async (item) => {
				if (item.homework_id == data.taskID) {
					if (
						item.homework_lesson in menus().permissions[chats[chatID].permission_title] &&
						(item.homework_creator == chatID || chats[chatID].permission_id == 4)
					) {
						taskForEdit = item
					}
				}
			})
		}
		if (taskForEdit == null) {
			await bot.sendMessage(chatID, "Нет доступа к этому дз.", {
				reply_markup: {
					keyboard: menus()[chats[chatID]],
				},
			})
			bot.answerCallbackQuery(message.id)
			if (pool[chatID]) {
				resetUserInput(chatID)
			}
		} else {
			await bot.sendMessage(chatID, "Введи новый текст для:\n" + buildHomeworkMessage(taskForEdit, chats[chatID]), {
				parse_mode: "HTML",
			})
			bot.answerCallbackQuery(message.id)
			if (pool[chatID]) {
				pool[chatID].target = "rewriteNewText"
				pool[chatID].taskForEdit = taskForEdit
			} else {
				pool[chatID] = {
					target: "rewriteNewText",
					creator: chatID,
					taskForEdit: taskForEdit,
				}
			}
		}
	}
	if (data.target == "editDeadlineForHomework") {
		if (chats[chatID].permission_title == "basic") return
		let taskForEdit = null
		for (let key of Object.keys(homework)) {
			homework[key].forEach(async (item) => {
				if (item.homework_id == data.taskID) {
					if (
						item.homework_lesson in menus().permissions[chats[chatID].permission_title] &&
						(item.homework_creator == chatID || chats[chatID].permission_id == 4)
					) {
						taskForEdit = item
					}
				}
			})
		}
		if (taskForEdit == null) {
			await bot.sendMessage(chatID, "Нет доступа к этому дз.", {
				reply_markup: {
					keyboard: menus()[chats[chatID]],
				},
			})
			bot.answerCallbackQuery(message.id)
			if (pool[chatID]) {
				resetUserInput(chatID)
			}
		} else {
			await bot.sendMessage(
				chatID,
				"Введи новый дедлайн для (Ответ требует формата дд.мм.гггг, например 01.01.1970. Обратите внимание на кол-во дней в месяце, чтобы домашка установилась правильно):"
			)
			await bot.sendMessage(chatID, buildHomeworkMessage(taskForEdit, chats[chatID]), { parse_mode: "HTML" })
			bot.answerCallbackQuery(message.id)
			if (pool[chatID]) {
				pool[chatID].target = "rewriteNewDeadline"
				pool[chatID].taskForEdit = taskForEdit
			} else {
				pool[chatID] = {
					target: "rewriteNewDeadline",
					creator: chatID,
					taskForEdit: taskForEdit,
				}
			}
		}
	}
	if (data.target == "editPermission") {
		if (chats[chatID].permission_title != "senior") {
			await bot.sendMessage(chatID, "У вас нет доступа к данному функционалу.", {
				reply_markup: {
					keyboard: chats[chatID].permission == "basic" ? menus().basic : menus().extended,
				},
			})
			return
		}
		if (data.user == "1386879737") {
			await bot.sendMessage(chatID, "Вы не можете изменить права данному пользователю.", {
				reply_markup: {
					keyboard: chats[chatID].permission == "basic" ? menus().basic : menus().extended,
				},
			})
			bot.answerCallbackQuery(message.id)
		} else {
			await db.run("UPDATE student SET student_permission = ? WHERE student_id = ?", [data.permission, data.user], (err) => {
				if (err) {
					console.log("1766 line")
					return console.error(err)
				}
				console.log("1769 line. Updating student permissions")
			})
			await bot.sendMessage(chatID, "Права пользователя обновлены", {
				reply_markup: {
					keyboard: chats[chatID].permission == "basic" ? menus().basic : menus().extended,
				},
			})
			await bot.sendMessage(data.user, `Ваши права доступа были изменены до уровня <strong>${data.permission}</strong>`, { parse_mode: "HTML" })
			await getUsersFromDB()
			bot.answerCallbackQuery(message.id)
		}
	}
	if (data.target == "deletePhotoDocForHomework") {
		if (chats[chatID].class == "basic") return
		let taskForEdit = null

		for (let key of Object.keys(homework)) {
			homework[key].forEach(async (item) => {
				if (item.homework_id == data.taskID) {
					if (
						item.homework_lesson in menus().permissions[chats[chatID].permission_title] &&
						(item.homework_creator == chatID || chats[chatID].permission_id == 4)
					) {
						taskForEdit = item
					}
				}
			})
		}
		if (taskForEdit == null) {
			await bot.sendMessage(chatID, "Нет доступа к этому дз.", {
				reply_markup: {
					keyboard: menus()[chats[chatID]],
				},
			})
			bot.answerCallbackQuery(message.id)
			if (pool[chatID]) {
				resetUserInput(chatID)
			}
		} else {
			if (homeworkWithFiles[taskForEdit.homework_id] == undefined) {
				bot.answerCallbackQuery(message.id)
				return await bot.sendMessage(chatID, "Данное дз не имеет фото/дз для удаления.")
			}
			await bot.sendMessage(chatID, "Введи айди документа для удаления")
			for (let fileID of homeworkWithFiles[taskForEdit.homework_id]) {
				if (files[fileID].file_type == "document")
					await bot.sendDocument(chatID, files[fileID].file_name, {
						caption: fileID,
					})
				if (files[fileID].file_type == "photo")
					await bot.sendPhoto(chatID, files[fileID].file_name, {
						caption: fileID,
					})
			}
			pool[chatID].target = "deletePhotoDocForHomework"
		}
		bot.answerCallbackQuery(message.id)
	}
	if (data.target == "addPhotoDocForHomework") {
		if (chats[chatID].class == "basic") return
		let taskForEdit = null

		for (let key of Object.keys(homework)) {
			homework[key].forEach(async (item) => {
				if (item.homework_id == data.taskID) {
					if (
						item.homework_lesson in menus().permissions[chats[chatID].permission_title] &&
						(item.homework_creator == chatID || chats[chatID].permission_id == 4)
					) {
						taskForEdit = item
					}
				}
			})
		}
		if (taskForEdit == null) {
			await bot.sendMessage(chatID, "Нет доступа к этому дз.", {
				reply_markup: {
					keyboard: menus()[chats[chatID]],
				},
			})
			bot.answerCallbackQuery(message.id)
			if (pool[chatID]) {
				resetUserInput(chatID)
			}
		} else {
			if (homeworkWithFiles[taskForEdit.homework_id]?.length > 10) {
				bot.answerCallbackQuery(message.id)
				return await bot.sendMessage(chatID, "Домашнее задание не может иметь более 10 закрепленных за ним файлов и фотографий.")
			}
			await bot.sendMessage(chatID, "Отправьте фото/документ для добавления (1 за раз).")
			pool[chatID].target = "addPhotoDocForHomework"
			pool[chatID].taskForEdit = taskForEdit
			bot.answerCallbackQuery(message.id)
		}
	}
	if (data.target == "editBookForTitle") {
		if (chats[chatID].permission_title != "senior") {
			await bot.sendMessage(chatID, "У вас нет доступа к данному функционалу.", {
				reply_markup: {
					keyboard: chats[chatID].permission == "basic" ? menus().basic : menus().extended,
				},
			})
			return
		}
		await getBooksFromDB()
		let bookForEdit = { bookID: data.data, bookName: books[data.data] }
		await bot.sendMessage(chatID, "Введите новое название для учебника.")
		pool[chatID].target = "rewriteNewTitleForBook"
		pool[chatID].data = bookForEdit
		bot.answerCallbackQuery(message.id)
	}
})
