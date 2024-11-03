function parseLessonsForDays(schedule) {
	let splitLessons = []

	let namesDaysOfWeek = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
	let currentDayOfweek = ""

	let numberOfDays = 7
	let numberOfLessons = 0

	let forRealNumberOfDay = 1

	let lessonInformation = {}

	let firstKeyWordForWeek = "чет"
	let secondKeyWordForWeek = "неч"
	let keyWordInSchedule = ""

	splitLessons = { [firstKeyWordForWeek]: {}, [secondKeyWordForWeek]: {} }

	for (let i = 1; i <= numberOfDays; i++) {
		Object.assign(splitLessons[firstKeyWordForWeek], { [i]: [] })
		Object.assign(splitLessons[secondKeyWordForWeek], { [i]: [] })
	}

	for (let i = 0; i < numberOfDays; i++) {
		currentDayOfweek = namesDaysOfWeek[i]
		numberOfLessons = schedule.week_days[currentDayOfweek].length

		for (let j = 0; j < numberOfLessons; j++) {
			lessonInformation = createLessonInformation()
			lessonInformation.name = removeExtraSpaces(schedule.week_days[currentDayOfweek][j].discipline.name)
			lessonInformation.type = removeExtraSpaces(schedule.week_days[currentDayOfweek][j].original_lesson_type)

			keyWordInSchedule = schedule.week_days[currentDayOfweek][j].original_dates
			keyWordInSchedule = keyWordInSchedule == null ? "" : keyWordInSchedule.trim().toLowerCase()

			if (Object.keys(splitLessons).includes(keyWordInSchedule)) {
				splitLessons[keyWordInSchedule][i + forRealNumberOfDay].push(lessonInformation)
			} else {
				splitLessons[firstKeyWordForWeek][i + forRealNumberOfDay].push(lessonInformation)
				splitLessons[secondKeyWordForWeek][i + forRealNumberOfDay].push(lessonInformation)
			}
		}
	}
	console.log(splitLessons)
	return splitLessons
}

function createLessonInformation() {
	return { name: "", type: "" }
}

function removeExtraSpaces(line) {
	if (line != null) return line.match(/(\S+)/g).join(" ")
	return line
}

module.exports = parseLessonsForDays
