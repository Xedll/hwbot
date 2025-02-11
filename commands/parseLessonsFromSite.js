const puppeteer = require("puppeteer")
const fs = require("fs")
const path = require("path")

let parseSellonsFromSite = async () => {
	const browser = await puppeteer.launch({
		headless: true,
		defaultViewport: false,
		userDataDir: ".tmp",
	})
	const page = await browser.newPage()
	await page.goto("https://kai.ru/raspisanie")
	await page.locator("input.field.span12.yui3-aclist-input").fill("4201")
	await page.locator("li ::-p-text(4201)").click()
	await page.locator("button ::-p-text(Расписание занятий)").click()

	const table = await page.locator(".span2.cell").waitHandle()

	result = await table.evaluate(() => {
		let namesDaysOfWeek = []
		let lessonsInformation = []
		let scheduleStructured = {}
		let countDaysOfWeek = document.querySelector(".span2.cell").querySelectorAll("h3")
		let scheduleOnWeek = document.querySelectorAll(".table.table-bordered.table-hover.table-striped.schedule")

		namesDaysOfWeek = getNamesDaysOfWeek(countDaysOfWeek)
		lessonsInformation = getLessonsInformation(namesDaysOfWeek, scheduleOnWeek, document)
		scheduleStructured = getScheduleStructured(namesDaysOfWeek, lessonsInformation)

		return scheduleStructured

		function getNamesDaysOfWeek(countDaysOfWeek) {
			let namesDaysOfWeek = []

			for (let i = 0; i < countDaysOfWeek.length; i++) {
				namesDaysOfWeek[i] = countDaysOfWeek[i].innerHTML
			}
			return namesDaysOfWeek
		}

		function getLessonsInformation(namesDaysOfWeek, scheduleOnWeek, document) {
			const DATE = 1
			const LESSON = 2
			const TYPE = 3

			let numberOfLesson = []

			let lessonsInformation = {}

			for (let i = 0; i < scheduleOnWeek.length; i++) {
				numberOfLesson = document.querySelectorAll("table")[i].querySelector("tbody").querySelectorAll("tr")

				lessonsInformation[namesDaysOfWeek[i]] = []

				for (let j = 0; j < numberOfLesson.length; j++) {
					let lesson = createLessonInformation()
					lesson.date = numberOfLesson[j].querySelectorAll("td")[DATE].innerHTML.trim()
					lesson.type = numberOfLesson[j].querySelectorAll("td")[TYPE].innerHTML.trim()
					lesson.name = numberOfLesson[j].querySelectorAll("td")[LESSON].innerHTML.trim()

					lessonsInformation[namesDaysOfWeek[i]].push(lesson)
				}
			}

			return lessonsInformation
		}

		function createLessonInformation() {
			return { date: "", type: "", name: "" }
		}

		function getScheduleStructured(namesDaysOfWeek, lessonsInformation) {
			const DAYOFWEEK = {
				0: "Понедельник",
				1: "Вторник",
				2: "Среда",
				3: "Четверг",
				4: "Пятница",
				5: "Суббота",
				6: "Воскресенье",
			}

			let scheduleStructured = {}

			let haveLessonOnThisDay = false

			for (let i = 0; i < Object.keys(DAYOFWEEK).length; i++) {
				haveLessonOnThisDay = namesDaysOfWeek.includes(DAYOFWEEK[i])

				if (haveLessonOnThisDay == false) {
					scheduleStructured[DAYOFWEEK[i]] = ""
					continue
				}

				scheduleStructured[DAYOFWEEK[i]] = lessonsInformation[DAYOFWEEK[i]]
			}

			return scheduleStructured
		}
	})

	saveInJson(await result)

	await browser.close()

	function saveInJson(result) {
		const jsonData = JSON.stringify(result)
		const filePath = "Schedule.json"

		try {
			fs.writeFileSync(path.resolve(__dirname, "../options/", filePath), jsonData)
			console.log("JSON data saved to file successfully.")
		} catch (error) {
			console.error("Error writing JSON data to file:", error)
		}
	}
}

module.exports = parseSellonsFromSite
