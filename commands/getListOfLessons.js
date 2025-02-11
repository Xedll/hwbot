function getListOfLessons(schedule) {
	let lessons = {}
	let namesDaysOfWeek = ["Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота", "Воскресенье"]
	let currentDayOfweek = ""
	let numberOfDays = 7
	for (let i = 0; i < numberOfDays; i++) {
		currentDayOfweek = namesDaysOfWeek[i]
		let numberOfLessons = schedule[currentDayOfweek].length
		for (let j = 0; j < numberOfLessons; j++) {
			let lessonsName = schedule[currentDayOfweek][j].name.match(/(\S+)/g).join(" ")
			let lessonType = schedule[currentDayOfweek][j].type.match(/(\S+)/g).join(" ")
			if (lessons[lessonsName] == undefined) {
				Object.assign(lessons, { [lessonsName]: [] })
				lessons[lessonsName].push(lessonType)
			} else if (lessons[lessonsName].includes(lessonType)) {
				continue
			} else {
				lessons[lessonsName].push(lessonType)
			}
		}
	}
	return lessons
}

module.exports = getListOfLessons
