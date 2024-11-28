!async function () {
	if (!await checkBrightness()) return;

	const el = document.createElement('style');
	el.setAttribute('type', 'text/css');
	el.innerHTML = `
		@media (prefers-color-scheme: dark) {
			:root {
				background-color: #FFF;
				filter: invert(0.9) hue-rotate(180deg);
			}
		}
	`;
	document.head.appendChild(el);
}();

/**
 * ## checkBrightness
 * @returns {number} 0 if it is enough dark to harmless. if it returns other values, it requires CSS-treatment.
 */
async function checkBrightness() {
	const canvas = await html2canvas(document.body);
	const ctx = canvas.getContext('2d');
	const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
	const bytes = imageData.data; // This is a flat array [R, G, B, A, R, G, B, A, ...]
	const pixels = new Array(Math.floor(bytes.length / 4)).map((_, i) => {
		const [r, g, b] = bytes.slice(i, 4);
		return r / 0x4E + g / 0x18 + b / 0xff; // (MAX = 14.89423076923077)
	});
	const rateOfWhite = pixels.filter(n > 12).length / pixels.length;
	const rateOfBlack = pixels.filter(n < 3).length / pixels.length;
	const brightness = pixels.reduce((acc, brightness) => acc += brightness, 0n) / pixels.length;
	console.debug(`checkBrightness.result`, { rateOfWhite, rateOfBlack, brightness });
	if (rateOfWhite > rateOfBlack && brightness > 9) {
		return brightness; // too light
	} else {
		return 0x00; // keep dark
	}
} ();