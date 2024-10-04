module.exports = function setDateForLessonHomework(splitLessons, lessonHomework, currentWeekNumber) {
	const NUMBER_OF_DAYS_IN_WEEK = 7
	const NEXT_DAY = 1

	let deadlineDate = new Date()
	deadlineDate.setDate(deadlineDate.getDate() + NEXT_DAY)

	let curretnDay = deadlineDate.getDay()

	let typesWeek = Object.keys(splitLessons)
	let currentTypeWeek = typesWeek[currentWeekNumber]
	let nextTypeWeek = 0

	let numberOfTypesWeek = typesWeek.length
	let numberOfStudyDays = Object.keys(splitLessons[currentTypeWeek]).length
	let numberOfLessonsInDay = 0
	let numberOfDaysOff = NUMBER_OF_DAYS_IN_WEEK - numberOfStudyDays

	if (deadlineDate.getDay() == 0) {
		deadlineDate.setDate(deadlineDate.getDate() + NEXT_DAY)
		curretnDay++
	}

	let equalLessonName = false
	let equalLessonType = false
	let lessonNotFound = true

	while (lessonNotFound) {
		numberOfLessonsInDay = splitLessons[currentTypeWeek][curretnDay].length || 0

		for (let j = 0; j < numberOfLessonsInDay; j++) {
			if (!splitLessons[currentTypeWeek][curretnDay]) continue
			equalLessonName = lessonHomework.homework_lesson === splitLessons[currentTypeWeek][curretnDay][j].name
			equalLessonType = lessonHomework.homework_type === splitLessons[currentTypeWeek][curretnDay][j].type

			if (equalLessonName && equalLessonType) {
				lessonNotFound = false

				deadlineDate = new Date(deadlineDate)
				lessonHomework.homework_deadline = deadlineDate
				break
			}
		}

		if (curretnDay >= numberOfStudyDays && lessonNotFound) {
			currentWeekNumber++
			nextTypeWeek = currentWeekNumber % numberOfTypesWeek

			currentTypeWeek = typesWeek[nextTypeWeek]
			curretnDay = 1

			deadlineDate.setDate(deadlineDate.getDate() + NEXT_DAY + numberOfDaysOff)
		} else if (lessonNotFound) {
			curretnDay++
			deadlineDate.setDate(deadlineDate.getDate() + NEXT_DAY)
		}
	}
	return lessonHomework
}
