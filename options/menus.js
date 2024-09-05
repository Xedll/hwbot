const parseLessonsForOptions = require("../commands/parseLessonsForOptions")
const lessons = require("./lessons.json")

const menus = () => {
	return {
		basic: [["Профиль"], ["Посмотреть дз"], ["Разное"]],
		extended: [["Профиль"], ["Добавить домашнее задание"], ["Посмотреть дз"], ["Разное"]],
		разное: {
			basic: [["Учебники"], ["Настройка получения уведомлений о добавлении нового дз"], ["Назад"]],
			middle: [["Редактирование домашнего задания"], ["Учебники"], ["Настройка получения уведомлений о добавлении нового дз"], ["Назад"]],
			junior: [["Редактирование домашнего задания"], ["Учебники"], ["Настройка получения уведомлений о добавлении нового дз"], ["Назад"]],
			senior: [
				["Редактирование домашнего задания"],
				["Редактирование учебников"],
				["Учебники"],
				["Настройка получения уведомлений о добавлении нового дз"],
				["Действия с админами"],
				["Пользователи"],
				["Ввести новый номер группы"],
				["Назад"],
			],
		},
		"Работа с домашним заданием": {
			basic: [["Изменить домашнее задание"], ["Удалить домашнее задание"], ["Назад"]],
		},
		profile: [["Выбрать группу по Английскому Языку"], ["Назад"]],
		homework: {
			senior: {
				add: [...parseLessonsForOptions(Object.keys(lessons), 1, "addHomeworkType")],
				edit: [...parseLessonsForOptions(Object.keys(lessons), 1, "edit")],
			},
			middle: {
				add: [...parseLessonsForOptions(Object.keys(lessons), 1, "addHomeworkType")],
				edit: [...parseLessonsForOptions(Object.keys(lessons), 1, "edit")],
			},
			junior: {
				add: [...parseLessonsForOptions(Object.keys(lessons), 1, "addHomeworkType", ["Иностранный язык"])],
				edit: [...parseLessonsForOptions(Object.keys(lessons), 1, "edit", ["Иностранный язык"])],
			},
		},
		permissions: {
			senior: lessons,
			middle: lessons,
			junior: { "Иностранный язык": lessons["Иностранный язык"] },
			basic: [],
		},
		"Действия с админами": [["Изменить права юзеру"]],
	}
}

module.exports = menus
