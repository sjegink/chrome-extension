/*
 * Chrome Extension / Background.js
 * It will be loaded by manifest.json
 */

// #region Tasks

/**
 * ## onTabFocus
 * @param {ChromeTab?} tab
 * @returns {Promise}
 */
async function onTabFocus(tab) {
	const resourceType = 'style';
	tab ??= await getCurrentTab();
	if (!tab) {
		return;
	}
	if (!checkInjectable(tab)) {
		actionIcon.set(null);
		return;
	}
	await prepareContentScript(tab);
	actionIcon.set(0 < await countResource(tab.id, resourceType));
}

/**
 * ## applyOnTab
 * The tab will be inverted!
 * @param {ChromeTab?} [tab]
 * @returns {Promise}
 */
async function applyOnTab(tab, isActive) {
	isActive ??= true;
	tab ??= await getCurrentTab();
	if (!checkInjectable(tab)) {
		actionIcon.set(null);
	} else {
		const tabId = tab.id;
		await prepareContentScript(tab);

		const resourceType = 'style';
		const alreadyInjected = 0 < await countResource(tabId, resourceType);

		actionIcon.set(isActive);
		if (isActive && !alreadyInjected) {
			await injectResource(tabId, resourceType, 'brightness-invert/brightness-invert.css');
		} else if (alreadyInjected){
			await unloadResource(tabId, resourceType);
		}
	}
}

/**
 * ## recoverOnTab
 * The tab will be original!
 * @param {ChromeTab?} [tab]
 * @returns {Promise}
 */
async function recoverOnTab(tab) {
	return applyOnTab(tab, false);
}

/**
 * ## reapplyOnTab
 * The tab will be invert or not: by action icon.
 * @param {ChromeTab?} [tab]
 * @returns {Promise}
 */
async function reapplyOnTab(tab) {
	const isActive = actionIcon.get();
	return applyOnTab(tab, isActive);
}

/**
 * ## toggleOnTab
 * toggle actionIcon on/off, and the tab will be invert or not: by action icon.
 * @param {ChromeTab?} [tab]
 * @returns {Promise}
 */
async function toggleOnTab(tab) {
	const wasActive = actionIcon.get();
	const isActive = !wasActive;
	return applyOnTab(tab, isActive);
}

/**
 * ## ActionIcon
 */
const actionIcon = {
	_value: false,
	_paths: {
		null: `assets/icon_sun_disabled.png`,
		true: `assets/icon_sun_invert.png`,
		false: `assets/icon_sun.png`,
	},
	/** @returns {boolean|null} getActionIcon */
	get() {
		return this._value;
	},
	/** @param {boolean|null} isActive setActionIcon */
	set(isActive) {
		this._value = isActive;
		const path = this._paths[this._value ?? null];
		chrome.action.setIcon({ path });
	},
}

// #endregion
// #region Event Listeners

// EventOn: Extension Icon Click
chrome.action.onClicked.addListener((tab) => {
	toggleOnTab(tab);
});

// EventOn: An page loaded
// : Even also when page changed by navigation
chrome.webNavigation.onCompleted.addListener(function (details) {
	reapplyOnTab();
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
	chrome.tabs.get(tabId).then(onTabFocus);
});


// #endregion
// #region Utilities

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
 * ## checkInjectable
 * @param {*} tab 
 * @returns {boolean} false if the state in tab cannot inject.
 */
function checkInjectable(tab) {
	if (!tab) return false;
	if ([
		/^https?:/,
		// Cannot access a chrome:// URL
	].filter(regex => regex.test(tab.url)).length < 1) return false;
	return true;
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
			console.warn('error on loading file', resourcePath);
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
 * ## countResource
 * @param {number} tabId identifier of Chrome tab that was injected.
 * @param {string} resourceType = 'style' | 'html'
 */
async function countResource(tabId, resourceType) {
	if (resourceType) {
		return sendMessageToTab(tabId, resourceType);
	} else {
		return Promise.all([
			'style',
			'html',
		].map(resourceType => countResource(tabId, resourceType)).reduce((acc, cnt) => acc + cnt, 0));
	}
}

/**
 * ## sendMessageToTab
 * @param {number} tabId identifier of Chrome tab tagetted
 * @param {string} action
 * @param {*} data
 */
async function sendMessageToTab(tabId, action, data) {
	const payload = { action };
	if (data !== undefined) payload.data = data;
	return new Promise(resolve => {
		chrome.tabs.sendMessage(tabId, payload, messageResponse => {
			resolve(messageResponse);
		});
	})
};

// #endregion