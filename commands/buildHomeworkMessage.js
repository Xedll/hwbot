module.exports = function CastToOneMassage(homework, lesson, creatorID) {
   var finalHomeworkText = "";
   var separator = "------";
   finalHomeworkText += `Дз по дисциплине "${lesson}": \n`;
   finalHomeworkText += separator + "\n";
   for (var i = 0; i < homework.length; i++) {
      finalHomeworkText += `${homework[i].text}\n${homework[i].deadline ? 'До: ' + homework[i].deadline : 'До: Сроки не были вписаны'}${homework[i].creator == creatorID ? '\nID: ' + homework[i].creationDate : ""}\n`
      if (i < homework.length - 1)
         finalHomeworkText += separator + "\n";
   }
   return finalHomeworkText;
}

