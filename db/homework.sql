PRAGMA foreign_keys=OFF;
BEGIN TRANSACTION;
CREATE TABLE permission (
  `permission_id` INTEGER PRIMARY KEY AUTOINCREMENT,
  `permission_title` VARCHAR(100) NOT NULL,
  );
CREATE TABLE `student` (

  `student_id` INT NOT NULL,

  `student_nickname` TEXT NOT NULL,

  `student_permission` INT NOT NULL,

  `student_english` INT NOT NULL,

   PRIMARY KEY 'student_id',

  CONSTRAINT `fk_student_permission1`

    FOREIGN KEY (`student_permission`)

    REFERENCES `permission` (`permission_id`)

    ON DELETE RESTRICT

    ON UPDATE CASCADE);
CREATE TABLE `homework` (

  `homework_id` INTEGER PRIMARY KEY AUTOINCREMENT,

  `homework_creator` INT NOT NULL,

  `homework_text` TEXT NULL,

  `homework_lesson` VARCHAR(150) NOT NULL,

  `homework_deadline` DATE NULL,

  `homework_type` VARCHAR(50) NOT NULL,

  `homework_english_group` INT NOT NULL,

  CONSTRAINT `fk_dz_user1`

    FOREIGN KEY (`homework_creator`)

    REFERENCES `student` (`student_id`)

    ON DELETE NO ACTION

    ON UPDATE CASCADE);
DELETE FROM sqlite_sequence;
COMMIT;
