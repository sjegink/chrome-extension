importScripts('sass/sass.min.js');

/** @type {boolean} */
let isActive = false;


//    ████████  █████  ███████ ██   ██ ███████ 
//       ██    ██   ██ ██      ██  ██  ██      
//       ██    ███████ ███████ █████   ███████ 
//       ██    ██   ██      ██ ██  ██       ██ 
//       ██    ██   ██ ███████ ██   ██ ███████ 

/**
 * ## onTabLoad
 * 보고 있던 탭에, 페이지가 로드되었을 경우.
 * @param {ChromeTab?} tab
 * @returns {void}
 */
async function onTabLoad(tab) {
	if (!await calling.resolve()) return;
	if (isActive) {
		applyOnTab(tab);
	}
}

/**
 * ## onTabFocus
 * 탭이 포커스를 얻었을 경우.
 * @param {ChromeTab?} tab
 * @returns {void}
 */
async function onTabFocus(tab) {
	if (!await calling.resolve()) return;
	if (isActive) {
		applyOnTab(tab);
	} else {
		applyOnTab(tab, false);
	}
}

/**
 * ## applyOnTab
 * @param {ChromeTab} [tab]
 */
async function applyOnTab(tab) {
	tab ??= await getCurrentTab();
	// Here is an example!
	if (/^https:\/\/calendar.google.com\/calendar/.test(tab.url)) {
		await prepareContentScript(tab);
		await unloadResource(tab.id);
		return isActive ?
			injectResource(tab.id, 'style', `dark-theme/calendar.google.com.scss`) :
			null;
	}
	console.log('NOTHING TO DO on this page', tab.url);
}


//    ███████ ██    ██ ███████ ███    ██ ████████     ██      ██ ███████ ████████ ███████ ███    ██ ███████ ██████  ███████ 
//    ██      ██    ██ ██      ████   ██    ██        ██      ██ ██         ██    ██      ████   ██ ██      ██   ██ ██      
//    █████   ██    ██ █████   ██ ██  ██    ██        ██      ██ ███████    ██    █████   ██ ██  ██ █████   ██████  ███████ 
//    ██       ██  ██  ██      ██  ██ ██    ██        ██      ██      ██    ██    ██      ██  ██ ██ ██      ██   ██      ██ 
//    ███████   ████   ███████ ██   ████    ██        ███████ ██ ███████    ██    ███████ ██   ████ ███████ ██   ██ ███████ 

// EventOn: Extension Icon Click
chrome.action.onClicked.addListener((tab) => {
	isActive ^= !!1;
	const iconPath = isActive ?
		'hello_extensions_invert.png' :
		'hello_extensions.png';
	chrome.action.setIcon({ path: iconPath });
	console.log(`ChromeExtension turned ${isActive ? 'ON' : 'OFF'}!`);
	applyOnTab();
});

// EventOn: An page loaded
chrome.webNavigation.onCompleted.addListener(function (details) {
	onTabLoad(undefined);
});

// EventOn: Chrome(window) get focus (or lost)
chrome.windows.onFocusChanged.addListener((windowId) => {
	const isLostFocus = windowId < 0;
	if (!isLostFocus) {
		onTabFocus(undefined);
	}
});

// EventOn: Chrome tab switched
chrome.tabs.onActivated.addListener(({ tabId, windowId }) => {
	chrome.tabs.get(tabId).then(applyOnTab);
});


//    ██    ██ ████████ ██ ██      ██ ████████ ██ ███████ ███████ 
//    ██    ██    ██    ██ ██      ██    ██    ██ ██      ██      
//    ██    ██    ██    ██ ██      ██    ██    ██ █████   ███████ 
//    ██    ██    ██    ██ ██      ██    ██    ██ ██           ██ 
//     ██████     ██    ██ ███████ ██    ██    ██ ███████ ███████ 

/**
 * ## calling
 * prevent execution duplicated by variety multiple events
 */
const calling = {
	/** @type {CallingId | null} */
	id: null,
	/** @returns {Proimise<boolean>} */
	resolve: function resolveCalling() {
		/** @type {number | null} */
		let thisTaskId = this.id = Date.now() + Math.random();
		return new Promise(resolve => setTimeout(() => {
			resolve(this.id === thisTaskId);
		}, 10));
	},
}
/**
 * @typedef CallingId
 * @type {number | null}
 */

/**
 * ## getCurrentTab
 * get current tab of this Chrome Window.
 * @returns {ChromeTab}
 */
async function getCurrentTab() {
	return new Promise(resolve => {
		chrome.tabs.query({ active: true, currentWindow: true }, async function ([tab]) {
			return resolve(tab);
		});
	});
}

/**
 * ## prepareContentScript
 * Make the page can be compatible with this extension scripts.
 * @param {*} tab 
 */
function prepareContentScript(tab) {
	return chrome.scripting.executeScript({
		target: { tabId: tab.id },
		files: ['content.js'],
	});
}

/**
 * ## injectResource
 * @param {number} tabId identifier of Chrome tab to be injected.
 * @param {string} resourceType = 'style' | 'html'
 * @param {string} resourcePath the relative path of resource file in this extension work directory
 */
async function injectResource(tabId, resourceType, resourcePath) {
	return fetch(chrome.runtime.getURL(resourcePath))
		.catch(err => {
			console.log('error on loading file', resourcePath);
			throw err;
		})
		.then(resp => {
			let text = resp.text();
			if (resourcePath.endsWith('scss')) return compileScss(text);
			return text;
		})
		.then(data => {
			return sendMessageToTab(tabId, resourceType, data);
		});
}

/**
 * ## unloadResource
 * @param {number} tabId identifier of Chrome tab that was injected.
 * @param {string} resourceType = 'style' | 'html'
 */
async function unloadResource(tabId, resourceType) {
	if (resourceType) {
		return sendMessageToTab(tabId, resourceType, null);
	} else {
		return Promise.all([
			'style',
			'html',
		].map(resourceType => unloadResource(tabId, resourceType)));
	}
}

/**
 * ## sendMessageToTab
 * @param {number} tabId identifier of Chrome tab tagetted
 * @param {string} action
 * @param {*} data
 */
async function sendMessageToTab(tabId, action, data) {
	return new Promise(resolve => {
		chrome.tabs.sendMessage(tabId, { action, data }, messageResponse => {
			resolve(messageResponse);
		});
	})
};

/**
 * ## compileScss
 * @param {*} raw text/scss
 * @returns {string} text/css
 */
async function compileScss(raw) {
	return new Promise(resolve => {
		new Sass().compile(raw, resolve);
	});
}