function getListOfLessons(schedule) {
	let lessons = {}

	let namesDaysOfWeek = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
	let currentDayOfweek = ""

	let numberOfDays = 7
	for (let i = 0; i < numberOfDays; i++) {
		currentDayOfweek = namesDaysOfWeek[i]

		let numberOfLessons = schedule.week_days[currentDayOfweek].length

		for (let j = 0; j < numberOfLessons; j++) {
			let lessonsName = schedule.week_days[currentDayOfweek][j].discipline.name.match(/(\S+)/g).join(" ")
			let lessonType = schedule.week_days[currentDayOfweek][j].original_lesson_type.match(/(\S+)/g).join(" ")

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
