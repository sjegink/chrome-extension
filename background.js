let isActive = false;


// #region Tasks

/**
 * ## onTabLoad
 * 보고 있던 탭에, 페이지가 로드되었을 경우.
 * @param {ChromeTab?} tab
 * @returns {void}
 */
async function onTabLoad(tab) {
}

/**
 * ## onTabFocus
 * 탭이 포커스를 얻었을 경우.
 * @param {ChromeTab?} tab
 * @returns {void}
 */
async function onTabFocus(tab) {
	const resourceType = 'style';
	tab ??= await getCurrentTab();
	if (tab) {
		await prepareContentScript(tab);
		setActionIcon(0 < await countResource(tab.id, resourceType));
	}
}

/**
 * ## applyOnTab
 * @param {ChromeTab} [tab]
 */
async function applyOnTab(tab) {
	tab ??= await getCurrentTab();
	const tabId = tab.id;
	await prepareContentScript(tab);

	const resourceType = 'style';
	const alreadyInjected = 0 < await countResource(tabId, resourceType);

	if (!alreadyInjected) {
		injectResource(tabId, resourceType, 'brightness-invert/brightness-invert.css');
		setActionIcon(true);
	} else {
		unloadResource(tabId, resourceType);
		setActionIcon(false);
	}
}

async function setActionIcon(isActive) {
	const iconPath = isActive ?
		'icon_sun_invert.png' :
		'icon_sun.png';
	chrome.action.setIcon({ path: 'assets/' + iconPath });
}

// #endregion
// #region Event Listeners

// EventOn: Extension Icon Click
chrome.action.onClicked.addListener((tab) => {
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
	if (!tab || !/^https?:/.test(tab.url)) {
		// Cannot access a chrome:// URL
		return;
	}
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