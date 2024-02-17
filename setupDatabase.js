const sqlite3 = require("sqlite3").verbose()

const db = new sqlite3.Database("../db/homework.db", sqlite3.OPEN_READWRITE, (err) => {
	if (err) console.log(err)
})
const student =
	"CREATE TABLE `student` (\
   `student_id` INT NOT NULL,\
   `student_nickname` TEXT NOT NULL,\
   `student_permission` INT NOT NULL,\
   `student_english` INT NOT NULL,\
   PRIMARY KEY 'student_id'\
CONSTRAINT `fk_student_permission1`\
     FOREIGN KEY(`student_permission`) \
REFERENCES`permission`(`permission_id`) \
     ON DELETE RESTRICT\
     ON UPDATE CASCADE); "

const hw =
	"CREATE TABLE `homework` (\
   `homework_id` INTEGER PRIMARY KEY AUTOINCREMENT,\
   `homework_creator` INT NOT NULL,\
   `homework_text` TEXT NULL,\
   `homework_lesson` VARCHAR(150) NOT NULL,\
   `homework_deadline` DATE NULL,\
   `homework_type` VARCHAR(50) NOT NULL,\
   `homework_english_group` INT NOT NULL,\
   CONSTRAINT `fk_dz_user1`\
     FOREIGN KEY (`homework_creator`)\
     REFERENCES `student` (`student_id`)\
     ON DELETE NO ACTION\
     ON UPDATE CASCADE);"

const permission =
	"CREATE TABLE permission (\
   `permission_id` INTEGER PRIMARY KEY AUTOINCREMENT,\
   `permission_title` VARCHAR(100) NOT NULL\
   );"

const hwlink =
	"CREATE TABLE IF NOT EXISTS`homework_has_file`(\
   `homework_id` INT NOT NULL,\
   `file_id` INT NOT NULL,\
   PRIMARY KEY(`homework_id`, `file_id`),\
   CONSTRAINT`fk_homework_has_file_homework1`\
     FOREIGN KEY(`homework_id`)\
     REFERENCES`homework`(`homework_id`)\
     ON DELETE CASCADE\
     ON UPDATE CASCADE,\
   CONSTRAINT`fk_homework_has_file_file1`\
     FOREIGN KEY(`file_id`)\
     REFERENCES`file`(`file_id`)\
     ON DELETE CASCADE\
     ON UPDATE CASCADE)"

const file =
	" CREATE TABLE IF NOT EXISTS `file` (\
   `file_id` INTEGER PRIMARY KEY AUTOINCREMENT,\
   `file_type` VARCHAR(45) NOT NULL,\
   `file_name` VARCHAR(150) NOT NULL);"

//!!db.run(hwlink)
//!!db.run(file)
