module.exports = function setDateForLessonHomework(splitLessons, lessonHomework, currentWeekNumber) {
	let deadlineDate = new Date()
	let week_days = [7, 1, 2, 3, 4, 5, 6]
	deadlineDate.setDate(deadlineDate.getDate() + 1)
	currentDay = week_days[deadlineDate.getDay()]
	let weekTypes = ["чет", "неч"]
	let currWeek = currentDay == 1 ? +!currentWeekNumber : +currentWeekNumber
	let lessonFinded = false
	while (!lessonFinded) {
		for (let i = 0; i < splitLessons[weekTypes[currWeek]][currentDay].length; i++) {
			if (
				lessonHomework.homework_lesson === splitLessons[weekTypes[currWeek]][currentDay][i].name &&
				lessonHomework.homework_type === splitLessons[weekTypes[currWeek]][currentDay][i].type
			) {
				lessonHomework.homework_deadline = deadlineDate
				lessonFinded = true
				break
			}
		}
		if (lessonFinded) break
		if (currentDay + 1 == 8) {
			currWeek = +!Boolean(currWeek)
		}
		currentDay = currentDay + 1 == 8 ? 1 : currentDay + 1
		deadlineDate.setDate(deadlineDate.getDate() + 1)
	}
	return lessonHomework
}
