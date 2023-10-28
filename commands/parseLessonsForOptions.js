function parseLessonsForOptions(lessons, numberOfButtons, target) {
   let lessonsForButton = [[]];

   let numberOfLessons = lessons.length;
   let lastButton = false

   for (let i = 0, j = 0; i < numberOfLessons; i++) {
      if ((i + 1) % numberOfButtons != 0) {
         lessonsForButton[j].push({ text: lessons[i], callback_data: JSON.stringify({ target: target, lesson: i }) })
      }
      else {
         lessonsForButton[j].push({ text: lessons[i], callback_data: JSON.stringify({ target: target, lesson: i }) })
         j++;
         lastButton = (i == numberOfLessons - 1);
         if (lastButton != true) {
            lessonsForButton.push([]);
         }
      }
   }

   return lessonsForButton;
}


module.exports = parseLessonsForOptions