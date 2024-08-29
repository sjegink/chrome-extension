// 중복 선언 금지
if (!window._$_CONTENT_SCRIPT_INJECTED_$_) {
	window._$_CONTENT_SCRIPT_INJECTED_$_ = Date.now();
	chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
		switch (message.action) {
			case 'hello':
				console.log("ChromeExtension says Hello World!");
				break;
			case 'style':
				{
					const CUSTOM_STYLEELEMENT_CLASSNAME = "chrome-extension-style-injected";
					document.head.querySelectorAll(`style.${CUSTOM_STYLEELEMENT_CLASSNAME}`).forEach(styleElement => styleElement.parentNode.removeChild(styleElement));
					let styleElement = document.createElement('style');
					styleElement.classList.add(CUSTOM_STYLEELEMENT_CLASSNAME);
					styleElement.innerHTML = message.data;
					document.head.appendChild(styleElement)
				}
				break;
			default:
				console.log('unknown message listen', message);
		}
		sendResponse('ㅇㅅㅇ');
	});
}

chrome.runtime.sendMessage({ action: 'hello' })
