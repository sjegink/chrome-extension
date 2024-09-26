window.fakeGpt = {
	TYPING_DELAY: 50,
	UI: document.querySelector('.fake-gpt-ui'),
	clear() {
		this.UI.querySelectorAll('article:not(.sample)').forEach(el => el.parentNode.removeChild(el));
	},
	write(text, isRightSide) {
		this._queue.push({ text, isRightSide });
		return this._run();
	},
	_queue: [],
	async _run() {
		let loopLimit = 1024;
		return this.runningPromise ??= new Promise(async resolve => {
			let article = this._newArticle()
			let message, text, ch, p, isRightSide = false;
			while (message = this._queue.shift()) {
				p = this._newP(article);
				while (text.length) {
					if(--loopLimit<0) throw new Error('loop limit'); // testing...
					ch = text.charAt(0);
					text = text.substring(1);
					await _putChar(p, ch);
				}
				break;
			}
		});
	},
	_newArticle(isRightSide) {
		if(isRightSide){
			const sample = this.UI.querySelector('article.--sample');
			const article = sample.cloneNode(true);
			article.classList.remove('--sample');
			sample.parentNode.appendChild(article);
			return article;
		}
	},
	_newP(article){
		const p = document.createElement('p');
		article.querySelector('--article-body').appendChild(p);
		return p;
	},
	async _putChar(p, ch) {
		p.innerHTML += ch;
		await new Promise(resolve => setTimeout(resolve, this.TYPING_DELAY));
	},
};