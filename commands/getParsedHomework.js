module.exports = function getParsedHomework(data) {
   let homework = {}
   for (let item of data) {
      if (homework[item.homework_lesson]) {
         homework[item.homework_lesson].push(item)
      } else {
         homework[item.homework_lesson] = [item]
      }
   }
   return homework
}