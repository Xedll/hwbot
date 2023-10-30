function getListOfLessons(schedule) {
   let lessons = [];
   let numberOfDays = Object.keys(schedule.data).length;

   for (let i = 1; i <= numberOfDays; i++) {
      let numberOfLessons = schedule.data[i].length;
      for (let j = 0; j < numberOfLessons; j++) {
         let lessonName = schedule.data[i][j].disciplName.match(/(\S+)/g).join(' ');
         if (lessons.includes(lessonName) == false || lessonName == 'Физическая культура и спорт (элективная)') {
            lessons.push(lessonName);
         }
      }
   }
   return lessons;
}
module.exports = getListOfLessons