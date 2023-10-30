function parseLessonsForDays(schedule) {
   let splitLessons;

   let numberOfDays = Object.keys(schedule).length;

   let arr = ['amt', 'nal', 'nou'];

   let dayNumberInSchedule = "";

   let lessonName;

   let weekNumber;

   let firstKeyWordForWeek = "чет";
   let secondKeyWordForWeek = "неч";

   splitLessons = { [firstKeyWordForWeek]: {}, [secondKeyWordForWeek]: {} };

   for (let i = 1; i <= numberOfDays; i++) {
      Object.assign(splitLessons[firstKeyWordForWeek], { [i]: [] });
      Object.assign(splitLessons[secondKeyWordForWeek], { [i]: [] });
   }

   for (let i = 1; i <= numberOfDays; i++) {
      numberOfLessons = schedule.data[i].length;

      for (let j = 0; j < numberOfLessons; j++) {
         lessonName = schedule.data[i][j].disciplName;

         keyWordInSchedule = schedule.data[i][j].dayDate.trim().toLowerCase();

         if (Object.keys(splitLessons).includes(keyWordInSchedule)) {
            splitLessons[keyWordInSchedule][i].push(lessonName);
         }
         else {
            splitLessons[firstKeyWordForWeek][i].push(lessonName);
            splitLessons[secondKeyWordForWeek][i].push(lessonName);
         }
      }
   }

   return splitLessons;
}

module.exports = parseLessonsForDays