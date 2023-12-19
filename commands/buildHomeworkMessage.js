module.exports = function CastToOneMassage(homework, lesson, chatEntity) {
   var finalHomeworkText = "";
   var separator = "------";
   finalHomeworkText += `Дз по дисциплине "<u>${lesson}</u>":\n`;
   finalHomeworkText += separator + "\n";
   for (var i = 0; i < homework.length; i++) {
      if (!(chatEntity.student_english == homework[i].homework_english_group || homework[i].homework_english_group == 0 || chatEntity.permission_title == 'senjor')) continue

      let deadlineDay = new Date(homework[i].homework_deadline).getDate() < 10 ? '0' + new Date(homework[i].homework_deadline).getDate() : new Date(homework[i].homework_deadline).getDate();
      let deadlineMonth = new Date(homework[i].homework_deadline).getMonth() + 1 < 10 ? '0' + (new Date(homework[i].homework_deadline).getMonth() + 1) : new Date(homework[i].homework_deadline).getMonth() + 1;
      let deadlineYear = new Date(homework[i].homework_deadline).getFullYear();
      let tempDeadline = deadlineDay + '.' + deadlineMonth + '.' + deadlineYear
      finalHomeworkText += `${homework[i].homework_text}\n${homework[i].homework_deadline ? 'До: ' + tempDeadline : 'До: Сроки не были вписаны'}\nТип: ${homework[i].homework_type} ${chatEntity.permission_title == 'senjor' ? '\nГруппа: ' + homework[i].homework_english_group : ''} ${(homework[i].homework_creator == chatEntity.student_id || chatEntity.permission_title == 'senjor') ? '\nID: ' + ' <code>' + homework[i].homework_id + '</code>' : ""}\n${chatEntity.permission_title == 'senjor' ? 'Создатель: ' + homework[i].homework_creator + '\n' : ''}`
      //if (i < homework.length - 1)
      finalHomeworkText += separator + "\n";
   }
   return finalHomeworkText;
}

