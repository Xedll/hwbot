module.exports = function getOverdueHomework(lessonsHomework, daysAgo) {
   let overdueHomework = {};

   let dateOverdueHomework = new Date();
   dateOverdueHomework.setDate(dateOverdueHomework.getDate() - daysAgo)

   let homework;
   let homeworkDeadline;

   let numberOfHomework;

   for (let lessonName in lessonsHomework) {
      numberOfHomework = lessonsHomework[lessonName].length;

      for (let i = 0; i < numberOfHomework; i++) {
         homework = lessonsHomework[lessonName][i];
         homeworkDeadline = new Date(homework.homework_deadline);

         if (homeworkDeadline.getTime() <= dateOverdueHomework.getTime()) {
            if (overdueHomework[lessonName] == undefined) {
               overdueHomework[lessonName] = [];
            }

            overdueHomework[lessonName].push(homework);

         }
      }
   }
   return overdueHomework;
} 