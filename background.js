/**
 * @type {[libDirName: string]: {[key: string]: number?]}}
 * - Implicit libName on here.
 * - It will import `/lib/${libDirName}/mapper.json`;
 * @prop {number} defaultValue
 */
const mappings = {
	'sample': {},
};
libLoading = Promise.all(Object.keys(mappings).map(async (libName) => {
	let rawJson;
	await fetch(chrome.runtime.getURL(`/lib/${libName}/mapper.json`))
		.then(async resp => {
			rawJson = await resp.text();
			let mappingArr = JSON.parse(rawJson);
			mappingArr = [mappingArr].flat(); // You may use [{}] or {} freely.
			rawJson = null;
			for (let mapping of mappingArr) {
				if (mapping.label !== undefined && typeof mapping.label !== 'string') throw new Error(`Property 'label' must be an array if exists!`);
				if (mapping.values !== null && !Array.isArray(mapping.values)) throw new Error(`Property 'values' must be an array or null!`);
				if (!Array.isArray(mapping.contents)) throw new Error(`Property 'contents' must be an array!`);
				mapping.contents.forEach((cont, i) => {
					let ct;
					ct = cont.match;
					if (typeof ct !== 'string') {
						let arr = [ct].flat();
						for (let j in arr) {
							let val = arr[j]
							if (typeof val !== 'string') {
								throw new Error(`Property 'contents[${i}].match' must be a string|string[]!`);
							}
						}
					}
					ct = cont.use;
					let valueCount = mapping.values?.length || 2;
					if (!Array.isArray(ct) || ct.length < valueCount) throw new Error(`Property 'contents[${i}].use' must be an array(${valueCount})!`);
					for (let usings of ct) {
						if (!Array.isArray(usings)) throw new Error(`Property 'contents[${i}].use' must be an array of strings!`);
						for (let val of usings) {
							if (typeof val !== 'string') {
								throw new Error(`Property 'contents[${i}].use' must be an array of strings!`);
							}
						}
					}
					mapping.value = mapping.defaultValue ?? 0;
				});
			}
			mappings[libName] = mappingArr;
		}).catch(err => {
			err.message += `  at "lib/${libName}/mapper.json"`;
			throw err;
		});
}));
/** @type {boolean} @deprecated */
let isActive = false;


// #region Tasks

/**
 * ## onTabLoad
 * 보고 있던 탭에, 페이지가 로드되었을 경우.
 * @param {ChromeTab?} tab
 * @returns {void}
 */
async function onTabLoad(tab) {
	if (!await calling.resolve()) return;
	applyOnTab(tab);
}

/**
 * ## onTabFocus
 * 탭이 포커스를 얻었을 경우.
 * @param {ChromeTab?} tab
 * @returns {void}
 */
async function onTabFocus(tab) {
	if (!await calling.resolve()) return;
	applyOnTab(tab);
}

/**
 * ## applyOnTab
 * @param {ChromeTab} [tab]
 * @param {ChromeTab} [libNameAndKeys]
 */
async function applyOnTab(tab, libNameAndKeys) {
	tab ??= await getCurrentTab();
	if (!tab) return; // DevTool is activated
	libNameAndKeys ??= Object.keys(mappings);
	// Prepare to matching
	const contentIdsByMatchKey = {};
	const filesByContentId = {};
	const applyContentIds = new Set();
	const applyLibs = new Set();
	const applyFiles = new Set();
	libNameAndKeys.forEach(libNameAndKey => {
		const [libName, key] = libNameAndKey.split('\t', 2);
		const mappingArr = mappings[libName];
		console.debug('libName,!', { mappings, libName, mappingArr });
		const keys = key ? [key] : Object.keys(mappingArr);
		for (let key of keys) {
			const mapping = mappingArr[key] ?? {};
			const value = mapping.value ?? 0;
			console.debug('value!', { value });
			for (let contIndex in mapping.contents) {
				const contentId = `${libName}\t${key}\t${contIndex}`;
				const cont = mapping.contents[contIndex];
				[cont.match].flat().forEach(matchKey => {
					(contentIdsByMatchKey[matchKey] ??= []).push(contentId);
				});
				filesByContentId[contentId] ??= cont.use[value];
			}
		}
	});
	// match
	for (const matchKey of Object.keys(contentIdsByMatchKey)) {
		const contentIds = contentIdsByMatchKey[matchKey];
		const regexp = new RegExp('^' + matchKey
			.replace(/\*/g, '.*')
			.replace(/\//g, '\\/')
			.replace(/\$/g, '\\$')
			+ '$');
		if (regexp.test(tab.url)) {
			contentIds.forEach(contentId => {
				applyContentIds.add(contentId);
			});
		}
	}
	// Listing resource files
	Array.from(applyContentIds).forEach(contentId => {
		const files = filesByContentId[contentId];
		files.forEach(fileName => {
			const libName = contentId.replace(/\t.*$/, '');
			applyLibs.add(libName);
			const filePath = `${libName}/${fileName}`;
			applyFiles.add(filePath);
		});
	});
	// Applying
	// FIXME: When partial of multiple libraries, Other libs must be stay!
	await unloadResource(tab.id);
	await Promise.all(Array.from(applyFiles).map(async (filePath) => {
		if (filePath.endsWith('.css'))
			return injectResource(tab.id, 'style', filePath);
		if (filePath.endsWith('.html'))
			return injectResource(tab.id, 'html', filePath);
		// if(filePath.endsWith('.js'))
		// return injectResource(tab.id, 'js', path);
		console.warn(`Unexpected file format : ${filePath}`);
	}));
	console.log(`${applyLibs.size} lib(s) (${applyFiles.size} ress) accepted on this page`, tab.url);
}

// #endregion
// #region Event Listeners

// EventOn: Extension Icon Click
chrome.action.onClicked.addListener((tab) => {
	isActive ^= !!1;
	const iconPath = isActive ?
		'hello_extensions_invert.png' :
		'hello_extensions.png';
	chrome.action.setIcon({ path: 'assets/' + iconPath });
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

// EventOn: Query from pop-ui
chrome.runtime.onMessage.addListener((payload, { id, origin, url }, callback) => {
	if (payload.identify !== 'sjegink.chromeExtensionAPI') return console.debug(), callback();
	if (!Object.hasOwn(payload, 'libName')) {
		return callback(mappings);
	}
	const mappingArr = mappings[payload.libName];
	if (!Object.hasOwn(payload, 'key')) {
		return callback(mappingArr);
	}
	if (!Object.hasOwn(payload, 'value')) {
		return callback(mappingArr[payload.key]);
	}
	else {
		console.log({ l: payload.libName, k: payload.key, v: payload.value });
		mappingArr[payload.key].value = payload.value;
		console.log('setValue', mappingArr[payload.key]);
		callback();
		applyOnTab(null, [`${payload.libName}\t${payload.key}`]);
	}
});


// #endregion
// #region Utilities

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
 * @param {string} resourcePath the relative path of resource file in this extension /lib directory
 */
async function injectResource(tabId, resourceType, resourcePath) {
	return fetch(chrome.runtime.getURL('lib/' + resourcePath))
		.catch(err => {
			console.log('error on loading file', resourcePath);
			throw err;
		})
		.then(resp => {
			let text = resp.text();
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

// #endregion