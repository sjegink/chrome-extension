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
		/* 
		// Here is an example!
		if (/^https:\/\/([^.]*\.)?chatgpt.com\//.test(tab.url)) {
			await injectContentJS(tab);
			return Promise.all([
				injectResource(tab.id, 'style', `html/fake-gpt-ui.css`),
				injectResource(tab.id, 'html', `html/fake-gpt-ui.html`),
				// This is not working: injectResource(tab.id, 'js', `html/fake-gpt-ui.js`),
			]);
		}
		*/
		console.log('NOTHING TO DO on this page', tab.url);
	});
}

function injectContentJS(tab) {
	return chrome.scripting.executeScript({
		target: { tabId: tab.id },
		files: ['content.js'],
	});
}

function injectResource(tabId, resourceType, resourcePath){
	return fetch(chrome.runtime.getURL(resourcePath)).then(resp => resp.text()).then(data => {
		return chrome.tabs.sendMessage(tabId, { action: resourceType, data });
	});
}