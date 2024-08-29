chrome.action.onClicked.addListener((tab) => {
	console.log('Extension icon clicked!');
});

chrome.webNavigation.onCompleted.addListener(function (details) {
	onTabActive();
});

chrome.tabs.onActivated.addListener((activeInfo) => {
	onTabActive();
});

function onTabActive() {
	chrome.tabs.query({ active: true, currentWindow: true }, async function ([tab]) {
		console.log('NOTHING TO DO on this page', tab.url);
	});
}

function injectContentJS(tab) {
	return chrome.scripting.executeScript({
		target: { tabId: tab.id },
		files: ['content.js'],
	});
}