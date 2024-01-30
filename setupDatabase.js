const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./db/homework.db', sqlite3.OPEN_READWRITE, (err) => {
   if (err) console.log(err)
})
const student = "CREATE TABLE `student` (\
   `student_id` INT NOT NULL,\
 \
   `student_nickname` TEXT NOT NULL,\
 \
   `student_permission` INT NOT NULL,\
 \
   `student_english` INT NOT NULL,\
 \
   PRIMARY KEY 'student_id'\
\
\
CONSTRAINT `fk_student_permission1`\
\
     FOREIGN KEY(`student_permission`) \
\
REFERENCES`permission`(`permission_id`) \
\
     ON DELETE RESTRICT\
\
     ON UPDATE CASCADE); "

const hw = "CREATE TABLE `homework` (\
\
   `homework_id` INTEGER PRIMARY KEY AUTOINCREMENT,\
 \
   `homework_creator` INT NOT NULL,\
 \
   `homework_text` TEXT NULL,\
 \
   `homework_lesson` VARCHAR(150) NOT NULL,\
 \
   `homework_deadline` DATE NULL,\
 \
   `homework_type` VARCHAR(50) NOT NULL,\
 \
   `homework_english_group` INT NOT NULL,\
 \
   CONSTRAINT `fk_dz_user1`\
 \
     FOREIGN KEY (`homework_creator`)\
 \
     REFERENCES `student` (`student_id`)\
 \
     ON DELETE NO ACTION\
 \
     ON UPDATE CASCADE);"

const permission = "CREATE TABLE permission (\
   `permission_id` INTEGER PRIMARY KEY AUTOINCREMENT,\
   `permission_title` VARCHAR(100) NOT NULL\
   );";

db.all('SELECT * FROM student JOIN permission ON student.student_permission=permission.permission_id', [], (err, rows) => {
   for (let i of rows) {
      console.log(i)
   }
});

//db.run('UPDATE permission SET permission_title="senior" WHERE permission_id=4')

// db.all('SELECT * FROM homework', [], (err, rows) => {
//    for (let i of rows) {
//       console.log(i)
//    }
// });

// db.run('INSERT INTO permission(permission_title) VALUES (?)', ['basic'])
// db.run('INSERT INTO permission(permission_title) VALUES (?)', ['junior'])
// db.run('INSERT INTO permission(permission_title) VALUES (?)', ['middle'])
//db.run('INSERT INTO permission(permission_title) VALUES (?)', ['senior'])

// db.run('UPDATE permission SET permission_title=senior WHERE permission_id=4', (err, rows) => {
//    console.log(rows)
// })
// db.all('SELECT * FROM permission', (err, rows) => {
//    console.log(rows)
// })


//db.run('DROP TABLE student;')
//db.run('DROP TABLE homework;')
//db.run('DROP TABLE permission;')
//db.run(student, [], (err) => { if (err) console.log(err) })
//db.run(hw, [], (err) => { if (err) console.log(err) })
//db.run(permission, [], (err) => { if (err) console.log(err) })