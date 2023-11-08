function getNextDayHomework(lessons, homework, currentWeekNumber) {
   let todayDate = new Date();
   let deadlineDate = new Date();

   let curretnDay = todayDate.getUTCDay();

   let typesWeek = Object.keys(lessons);
   let currentTypeWeek = typesWeek[currentWeekNumber];
   let nextTypeWeek = 0;

   let numberOfTypesWeek = typesWeek.length;
   let numberOfHomework = homework.length;
   let numberOfDaysInWeek = lessons[currentTypeWeek].length;
   let numberOfLessonsInDay = 0;

   let equalLessonName = false;
   let lessonNotFound = true;

   for (let i = 0; i < numberOfHomework; i++) {
      deadlineDate = todayDate;
      currentTypeWeek = typesWeek[currentWeekNumber];
      curretnDay = todayDate.getUTCDay();
      lessonNotFound = true;

      if (homework[i].deadline != 0) {
         continue;
      }

      while (lessonNotFound) {
         numberOfLessonsInDay = lessons[currentTypeWeek][curretnDay].length;

         for (let j = 0; j < numberOfLessonsInDay; j++) {
            equalLessonName = (homework[i].lesson === lessons[currentTypeWeek][curretnDay][j].name)

            if (equalLessonName) {
               lessonNotFound = false;

               deadlineDate = new Date(deadlineDate);
               homework[i].deadline = deadlineDate.getTime();
               break;
            }
         }

         if (curretnDay > numberOfDaysInWeek && lessonNotFound) {
            currentWeekNumber++
            nextTypeWeek = (currentWeekNumber) % numberOfTypesWeek;

            currentTypeWeek = typesWeek[nextTypeWeek];
            curretnDay = 1;

            deadlineDate.setDate(deadlineDate.getDate() + 1)
         }
         else if (lessonNotFound) {
            curretnDay++;
            deadlineDate.setDate(deadlineDate.getDate() + 1);
         }
      }
   }

   return homework;

}