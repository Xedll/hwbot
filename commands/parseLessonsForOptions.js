function parseLessonsForOptions(lessons, numberOfButtons, target, arr = [], optionalData = {}) {
   let lessonsForButton = [[]];
   let lastButton = false

   let temp = []
   if (arr.length > 0) {
      lessons.forEach((element, index) => {
         if (arr.includes(element)) {
            temp.push({ text: lessons[index], callback_data: JSON.stringify({ target: target, lesson: index, ...optionalData }) })
         }
      });
   } else {
      lessons.map((item, index) => {
         temp.push({ text: item, callback_data: JSON.stringify({ target: target, lesson: index, ...optionalData }) })
      })
   }

   for (let i = 0, j = 0; i < temp.length; i++) {

      if ((i + 1) % numberOfButtons != 0) {
         lessonsForButton[j].push({ text: temp[i].text, callback_data: temp[i].callback_data })
      }
      else {
         lessonsForButton[j].push({ text: temp[i].text, callback_data: temp[i].callback_data })
         j++;
         lastButton = (i == temp.length - 1);
         if (lastButton != true) {
            lessonsForButton.push([]);
         }
      }
   }
   return lessonsForButton;
}


module.exports = parseLessonsForOptions