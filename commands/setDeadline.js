module.exports = function setDateForLessonHomework(splitLessons, lessonHomework, currentWeekNumber) {
   const NUMBER_OF_DAYS_IN_WEEK = 7;
   const NEXT_DAY = 1;

   let deadlineDate = new Date();
   deadlineDate.setDate(deadlineDate.getDate() + NEXT_DAY);

   let currentDay = deadlineDate.getDay();

   let typesWeek = Object.keys(splitLessons);
   let currentTypeWeek = typesWeek[currentWeekNumber];
   let nextTypeWeek = 0;

   let numberOfTypesWeek = typesWeek.length;
   let numberOfStudyDays = Object.keys(splitLessons[currentTypeWeek]).length;
   let numberOfLessonsInDay = 0;
   let numberOfDaysOff = NUMBER_OF_DAYS_IN_WEEK - numberOfStudyDays;

   let equalLessonName = false;
   let equalLessonType = false;
   let lessonNotFound = true;

   while (lessonNotFound) {
      numberOfLessonsInDay = splitLessons[currentTypeWeek][currentDay].length;

      for (let j = 0; j < numberOfLessonsInDay; j++) {
         equalLessonName = (lessonHomework.lesson === splitLessons[currentTypeWeek][currentDay][j].name)
         equalLessonType = (lessonHomework.type === splitLessons[currentTypeWeek][currentDay][j].type)

         if (equalLessonName && equalLessonType) {
            lessonNotFound = false;

            deadlineDate = new Date(deadlineDate);
            lessonHomework.deadline = deadlineDate
            break;
         }
      }

      if (currentDay >= numberOfStudyDays && lessonNotFound) {
         currentWeekNumber++
         nextTypeWeek = (currentWeekNumber) % numberOfTypesWeek;

         currentTypeWeek = typesWeek[nextTypeWeek];
         currentDay = 1;

         deadlineDate.setDate(deadlineDate.getDate() + NEXT_DAY + numberOfDaysOff)
      }
      else if (lessonNotFound) {
         currentDay++;
         deadlineDate.setDate(deadlineDate.getDate() + NEXT_DAY);
      }
   }
   return lessonHomework;
}
