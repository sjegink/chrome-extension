// 중복 선언 금지
if (!window._$_CONTENT_SCRIPT_INJECTED_$_) {
	console.info(`This page being affected by ChromeExtension:sjegink's YouTubeUtilties!`);
	function tryInject() {
		console.info(`sjegink's YouTubeUtilties - try inject into YouTube Player`);
		const INJECTED_CLASS_NAME = 'sjegink-ytu';

		// remove garbages
		document.querySelectorAll('.' + INJECTED_CLASS_NAME).forEach((i, e) => {
			/** @type {HTMLElement} */
			let parent = e.parent;
			parent.removeChild(e);
		});

		// define references
		const $container = getEl('#ytd-player');
		const $timeWrapper = getElIn($container, '.ytp-time-contents');
		const $timeSeparator = getElIn($timeWrapper, '.ytp-time-separator');
		/** @type {HTMLVideoElement} */
		const $video = getElIn($container, 'video');

		// #region Repeator
		{
			const repeator = {
				/** @type {boolean} can inactivate repetition even if btm,etm are set */
				isActive: false,
				/** @type {number} timeInMilliseconds */
				btm: null,
				/** @type {number} timeInMilliseconds */
				etm: null,
				/** @type {number} setInterval() */
				_timer: null,
				/**
				 * check btm and etm is complete or not
				 * @returns {boolean|null}
				 * - `true`: perpect to play!
				 * - `false`: complete, but invalid.
				 * - `null`: insufficient value yet.
				 */
				checkTime() {
					if (this.btm == null || this.etm == null) return null;
					if (!this.isActive) return null;
					return this.btm + 2000 <= this.etm;
				},
				/** Start or Stop repetition */
				updateRepeator() {
					let delay = 100;
					this.stopRepeator();
					if (this.checkTime() === null || $video.paused) return;
					if (this.checkTime() !== true) return console.warn(`Timer Invalid`, ui.getText());
					this._timer = setInterval(() => {
						if ($video.paused) return;
						let tOld = $video.currentTime * 1000;
						if (this.etm <= tOld) {
							let tNew = $video.currentTime - (this.etm - this.btm) / 1000;
							if (this.btm + delay < tNew * 1000) tNew = this.btm / 1000; // if out of repetion range, force set to btm
							$video.currentTime = tNew;
						}
					}, delay);
					console.info(`Repetion Start : ${ui.getText()}`);
				},
				setActivateRepeator(beActive = true) {
					this.isActive = Boolean(beActive);
					ui.update();
					this.updateRepeator();
				},
				toggleActivateRepeator() {
					this.setActivateRepeator(!this.isActive);
				},
				/** stop repetition force */
				stopRepeator() {
					clearInterval(this._timer);
					if (this._timer) this._timer = null;
				},
				/** set both btm and etm using promptUI */
				setTimeByPrompt() {
					const wasPaused = $video.paused;
					$video.pause();
					let text = prompt('Write StartTime and EndTime to repeat in seconds.\n(ex: "0.155~8.755")',
						this.btm && this.etm
							? `${(this.btm / 1000).toFixed(3)} ~ ${(this.etm / 1000).toFixed(3)}`
							: this.btm != null && (this.btm / 1000).toFixed(3)
							|| this.etm != null && (this.etm / 1000).toFixed(3)
							|| '');
					if (text != null) {
						const matches = text.match(/^\s*(\d+(?:\.\d+)?)\s*~\s*(\d+(?:\.\d+)?)\s*$/);
						if (matches === null) {
							const err = new Error(`Invalid Input:\t${text}`);
							console.warn(err);
							alert(err.message.replace('\t', '\n'));
						} else {
							[this.btm, this.etm] = [matches[1], matches[2]].map(str => {
								return Math.floor(Number(str) * 1000 + .5);
							});
							ui.update();
						}
					}
					if(!wasPaused) $video.play();
					this.updateRepeator();
				},
				/** set time, step by step */
				addTime(sec) {
					sec ??= $video.currentTime;
					const millis = Math.floor(sec * 1000 + .5);
					console.log({ millis });
					if (this.btm === null) {
						this.btm = millis;
					}
					else if (this.etm === null) {
						this.etm = millis;
						this.isActive = true;
					}
					ui.update();
					this.updateRepeator();
				},
				/** unset time, step by step */
				subTime() {
					if (this.etm !== null) {
						this.etm = null;
					}
					else if (this.btm !== null) {
						this.btm = null;
					}
					ui.update();
					this.updateRepeator();
				},
				clearTime() {
					this.stopRepeator();
					this.btm = this.etm = null;
					ui.update();
				},
			};
			const ui = {
				/** @type {HTMLSpanElement} */
				$display: null,
				_init() {
					// el:separator
					const $timeSeparator1 = newEl('span', {
						class: [INJECTED_CLASS_NAME, 'ytp-time-repetionseparator'],
						textContent: ' / ',
					});
					$timeSeparator.parentNode.insertBefore($timeSeparator1, $timeSeparator);
					// el:display
					this.$display = newEl('span', {
						class: [INJECTED_CLASS_NAME, 'ytp-time-repetiondisplay'],
						css: { cursor: 'pointer' },
					});
					$timeSeparator.parentNode.insertBefore(this.$display, $timeSeparator);
					// Handle User Event
					this.$display.addEventListener('click', this.onRepetionClickL);
					this.$display.addEventListener('contextmenu', this.onRepetionClickR);
					// finish
					this.update();
					delete this._init;
					return this;
				},
				onRepetionClickL(ev) {
					if (repeator.etm == null) {
						repeator.addTime();
						repeator.updateRepeator();
					} else {
						repeator.toggleActivateRepeator();
					}
				},
				onRepetionClickR(ev) {
					ev.preventDefault();
					ev.stopPropagation();
					repeator.setTimeByPrompt();
				},
				getText() {
					return this.$display.textContent;
				},
				update() {
					const color = {
						true: '',
						false: 'red',
						null: 'gray',
					}[repeator.checkTime()];
					const text =
						repeator.btm == null
							? `NO-REPEAT`
							: repeator.etm == null
								? `${this.formatTime(repeator.btm)} ~ ...`
								: `${this.formatTime(repeator.btm)} ~ ${this.formatTime(repeator.etm)}`;
					this._setDisplay(text, color);
				},
				formatTime(t) {
					const h = Math.floor(t / 3600000);
					const m = Math.floor((t % 3600000) / 60000);
					const s = Math.floor((t % 60000) / 1000);
					const l = t % 1000;
					return [
						h ? h + ':' : '',
						m.toString().padStart(2, '00'),
						':' + s.toString().padStart(2, '00'),
						'.' + l.toString().padStart(3, '000'),
					].join('');
				},
				_setDisplay(text, color) {
					this.$display.textContent = text;
					this.$display.style.color = color;
				},
			}._init();
		}
		// #endregion

		document.body.removeEventListener('click', tryInject);
	}
	document.body.addEventListener('click', tryInject);

	window._$_CONTENT_SCRIPT_INJECTED_$_ = Date.now();
}

// #region Functions...

/**
 * ## get Element In Parent
 * same with .querySelector, but if multiple elements found unexpectedly, then throw.
 * @param {HTMLElement} parent 
 * @param {string} qs 
 * @returns {HTMLElement}
 */
function getElIn(parent, qs) {
	const elements = parent.querySelectorAll(qs);
	if (elements.length !== 1) {
		console.error(`queryselect '${qs}' in ${parent} ...`);
		(elements[0] && null).notOne();
	}
	return elements[0];
}

/**
 * ## get Element (InRoot)
 * @param {string} qs 
 * @returns {HTMLElement}
 */
function getEl(qs) {
	return getElIn(document, qs);
}

/**
 * ## new Element
 * @param {string} tagName 
 * @param {{attr?:object, css?:object, [k:string]:any}?} options 
 * @param {HTMLElement} [parent]
 */
function newEl(tagName, options, parent) {
	/** @type {HTMLElement} */
	const el = document.createElement(tagName);
	Object.entries(options ?? {}).forEach(([optKey, optVal]) => {
		switch (optKey) {
			case 'class':
				if (!Array.isArray(optVal)) optVal = String(optVal ?? '').match(/\S+/g) || [];
				optVal.forEach(className => el.classList.add(String(className)));
				break;
			case 'attr':
				Object.entries(optVal ?? {}).forEach(([attrName, attrValue]) => {
					if (attrValue === undefined) return;
					else if (attrValue === null) el.removeAttribute(attrName);
					else el.setAttribute(attrName, attrValue);
				});
				break;
			case 'css':
				assignDeep(el.style, optVal);
				break;
			default:
				el[optKey] = optVal;
		};
	});
	if (parent) parent.appendChild(el);
	return el;
}

function assignDeep(obj, feed) {
	if (typeof (obj ?? 0) === 'object' && typeof (feed ?? 0) === 'object') {
		Object.entries(feed).forEach(([k, v]) => {
			if (v === undefined) delete obj[k];
			else obj[k] = assignDeep(obj[k], v);
		});
		return obj;
	} else {
		return feed;
	}
}