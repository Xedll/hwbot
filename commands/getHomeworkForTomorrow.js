module.exports = function getHomeworkForTomorrow(lessonsHomework) {
   const NEXT_DAY = 1;

   let homeworkOnNextDay = {};


   let nextDay = new Date();
   nextDay.setDate(nextDay.getDate() + NEXT_DAY)

   let numberOfHomework;
   let homework;
   let homeworkDeadline;

   for (let lessonName in lessonsHomework) {
      numberOfHomework = lessonsHomework[lessonName].length;

      for (let i = 0; i < numberOfHomework; i++) {
         homework = lessonsHomework[lessonName][i];
         homeworkDeadline = new Date(homework.homework_deadline);

         if (nextDay.toDateString() === homeworkDeadline.toDateString()) {
            if (!homeworkOnNextDay[lessonName]) {
               homeworkOnNextDay[lessonName] = [];
            }

            homeworkOnNextDay[lessonName].push(homework);

         }
      }
   }

   if (Object.keys(homeworkOnNextDay).length == 0) {
      return 0
   } else {
      return homeworkOnNextDay;
   }
} 