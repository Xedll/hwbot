module.exports = function CastToOneMassage(homework, chatEntity) {
	var finalHomeworkText = ""
	var separator = "------"
	let deadlineDay =
		new Date(homework.homework_deadline).getDate() < 10
			? "0" + new Date(homework.homework_deadline).getDate()
			: new Date(homework.homework_deadline).getDate()
	let deadlineMonth =
		new Date(homework.homework_deadline).getMonth() + 1 < 10
			? "0" + (new Date(homework.homework_deadline).getMonth() + 1)
			: new Date(homework.homework_deadline).getMonth() + 1
	let deadlineYear = new Date(homework.homework_deadline).getFullYear()
	let tempDeadline = deadlineDay + "." + deadlineMonth + "." + deadlineYear
	finalHomeworkText += `${homework.homework_text}\n${homework.homework_deadline ? "До: " + tempDeadline : "До: Сроки не были вписаны"}\nТип: ${
		homework.homework_type
	} ${chatEntity.permission_title == "senior" ? "\nГруппа: " + homework.homework_english_group : ""} ${
		homework.homework_creator == chatEntity.student_id || chatEntity.permission_title == "senior"
			? "\nID: " + " <code>" + homework.homework_id + "</code>"
			: ""
	}${chatEntity.permission_title == "senior" ? "\nСоздатель: " + homework.homework_creator : ""}`
	finalHomeworkText = `${separator}${separator}\n${finalHomeworkText}\n${separator}${separator}`
	return finalHomeworkText
}
