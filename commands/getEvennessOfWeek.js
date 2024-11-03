module.exports = () => {
	return +!(Math.floor((new Date().getTime() - 604_800_000) / 604_800_000) % 2) == 0
}
