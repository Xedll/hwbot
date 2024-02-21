module.exports = function getHomework(allHomework, days, options) {
	const OVERDUE = "overdue"
	const AHEAD = "ahead"
	const operation = {
		[OVERDUE]: function (a, b) {
			return a <= b
		},
		[AHEAD]: function (a, b) {
			return a >= b
		},
	}

	let compare = operation[options.mode]

	let overdueHomework = {}

	let dateHomework = new Date()

	if (options.mode == OVERDUE) {
		dateHomework.setDate(dateHomework.getDate() - days)
	} else {
		dateHomework.setDate(dateHomework.getDate() + days)
	}

	dateHomework.setHours(0, 0, 0, 0)

	let homework
	let homeworkDeadline

	let numberOfHomework

	for (let lessonName in allHomework) {
		numberOfHomework = allHomework[lessonName].length

		for (let i = 0; i < numberOfHomework; i++) {
			homework = allHomework[lessonName][i]

			homeworkDeadline = new Date(homework.homework_deadline)
			homeworkDeadline.setHours(0, 0, 0, 0)

			if (compare(homeworkDeadline.getTime(), dateHomework.getTime())) {
				if (overdueHomework[lessonName] == undefined) {
					overdueHomework[lessonName] = []
				}

				overdueHomework[lessonName].push(homework)
			}
		}
	}
	return overdueHomework
}
