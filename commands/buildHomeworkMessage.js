module.exports = function CastToOneMassage(homework, lesson, creatorID) {
   var finalHomeworkText = "";
   var separator = "------";
   finalHomeworkText += `Дз по дисциплине "${lesson}": \n`;
   finalHomeworkText += separator + "\n";
   for (var i = 0; i < homework.length; i++) {
      let deadlineDay = new Date(homework[i].homework_deadline).getDate() < 10 ? '0' + new Date(homework[i].homework_deadline).getDate() : new Date(homework[i].homework_deadline).getDate();
      let deadlineMonth = new Date(homework[i].homework_deadline).getMonth() + 1 < 10 ? '0' + (new Date(homework[i].homework_deadline).getMonth() + 1) : new Date(homework[i].homework_deadline).getMonth() + 1;
      let deadlineYear = new Date(homework[i].homework_deadline).getFullYear();
      let tempDeadline = deadlineDay + '.' + deadlineMonth + '.' + deadlineYear
      finalHomeworkText += `${homework[i].homework_text}\n${homework[i].homework_deadline ? 'До: ' + tempDeadline : 'До: Сроки не были вписаны'}\nТип: ${homework[i].homework_type}${(homework[i].homework_creator == creatorID || creatorID == '1386879737') ? '\nID: ' + ' <code>' + homework[i].homework_id + '</code>' : ""}\n${creatorID == '1386879737' ? 'Author: ' + homework[i].homework_creator + '\n' : '\n'}`
      if (i < homework.length - 1)
         finalHomeworkText += separator + "\n";
   }
   return finalHomeworkText;
}

