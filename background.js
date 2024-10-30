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
		if (/^https:\/\/redmine.altava.com\//.test(tab.url)) {
			await injectContentJS(tab);
			const cssData = await fetch(chrome.runtime.getURL(`css/redmine.altava.com.css`)).then(resp => resp.text());
			console.log({ cssData });
			return chrome.tabs.sendMessage(tab.id, {
				action: 'style',
				data: cssData,
			});
		}
		if (/^https:\/\/calendar\.google\.com\/calendar\/u\//.test(tab.url)) {
			await injectContentJS(tab);
			const cssData = await fetch(chrome.runtime.getURL(`css/calendar.google.com.css`)).then(resp => resp.text());
			console.log({ cssData });
			return chrome.tabs.sendMessage(tab.id, {
				action: 'style',
				data: cssData,
			});
		}
		if ([
			/https:\/\/www\.docswave\.com\//,
		].map(re => re.test(tab.url)).includes(true)) {
			await injectContentJS(tab);
			const cssData = await fetch(chrome.runtime.getURL(`css/dark-invert.css`)).then(resp => resp.text());
			console.log({ cssData });
			return chrome.tabs.sendMessage(tab.id, {
				action: 'style',
				data: cssData,
			});
		}
		console.log('NOTHING TO DO on this page', tab.url);
	});
}

function injectContentJS(tab) {
	return chrome.scripting.executeScript({
		target: { tabId: tab.id },
		files: ['content.js'],
	});
}