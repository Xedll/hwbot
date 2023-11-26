function getListOfLessons(schedule) {
   let lessons = {};
   let numberOfDays = Object.keys(schedule).length;

   for (let i = 1; i <= numberOfDays; i++) {
      let numberOfLessons = schedule[i].length;

      for (let j = 0; j < numberOfLessons; j++) {
         let lessonsName = schedule[i][j].disciplName.match(/(\S+)/g).join(" ");
         let lessonType = schedule[i][j].disciplType.match(/(\S+)/g).join(" ");

         if (lessons[lessonsName] == undefined) {
            Object.assign(lessons, { [lessonsName]: [] });
            lessons[lessonsName].push(lessonType);
         }
         else if (lessons[lessonsName].includes(lessonType)) {
            continue;
         }
         else {
            lessons[lessonsName].push(lessonType);
         }
      }
   }
   return lessons;
}
module.exports = getListOfLessons