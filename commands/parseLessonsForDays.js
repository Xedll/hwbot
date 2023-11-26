function parseLessonsForDays(schedule) {
   let splitLessons;

   let numberOfDays = Object.keys(schedule).length;

   let firstKeyWordForWeek = "чет";
   let secondKeyWordForWeek = "неч";

   splitLessons = { [firstKeyWordForWeek]: {}, [secondKeyWordForWeek]: {} };

   for (let i = 1; i <= numberOfDays; i++) {
      Object.assign(splitLessons[firstKeyWordForWeek], { [i]: [] });
      Object.assign(splitLessons[secondKeyWordForWeek], { [i]: [] });
   }

   for (let i = 1; i <= numberOfDays; i++) {
      let numberOfLessons = schedule[i].length;

      for (let j = 0; j < numberOfLessons; j++) {
         let lessonInformation = createLessonInformation();
         lessonInformation.name = removeExtraSpaces(schedule[i][j].disciplName);
         lessonInformation.type = removeExtraSpaces(schedule[i][j].disciplType);

         let keyWordInSchedule = schedule[i][j].dayDate.trim().toLowerCase();

         if (Object.keys(splitLessons).includes(keyWordInSchedule)) {
            splitLessons[keyWordInSchedule][i].push(lessonInformation);
         }
         else {
            splitLessons[firstKeyWordForWeek][i].push(lessonInformation);
            splitLessons[secondKeyWordForWeek][i].push(lessonInformation);
         }
      }
   }

   return splitLessons;
}

function createLessonInformation() {
   return { name: '', type: '' };
}

function removeExtraSpaces(line) {
   if (line != null)
      return line.match(/(\S+)/g).join(" ");
   return line
}

module.exports = parseLessonsForDays