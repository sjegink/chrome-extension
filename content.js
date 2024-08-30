// 중복 선언 금지
if (!window._$_CONTENT_SCRIPT_INJECTED_$_) {
	window._$_CONTENT_SCRIPT_INJECTED_$_ = Date.now();
	chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
		switch (message.action) {
			case 'hello':
				console.log('ChromeExtension says:', message.data ?? 'Hello World!');
				break;
			case 'style':
				{
					const CUSTOM_STYLEELEMENT_CLASSNAME = "chrome-extension-style-injected";
					document.head.querySelectorAll(`style.${CUSTOM_STYLEELEMENT_CLASSNAME}`).forEach(styleElement => styleElement.parentNode.removeChild(styleElement));
					const styleElement = document.createElement('style');
					styleElement.classList.add(CUSTOM_STYLEELEMENT_CLASSNAME);
					styleElement.innerHTML = message.data;
					document.head.appendChild(styleElement);
					console.log('A style element has been injected.');
				}
				break;
			case 'html': {
				{
					const CUSTOM_ELEMENT_CLASSNAME = "chrome-extension-html-injected";
					document.body.querySelectorAll(`.${CUSTOM_ELEMENT_CLASSNAME}`).forEach(styleElement => styleElement.parentNode.removeChild(styleElement));
					const injectingElement = document.createElement('div');
					injectingElement.classList.add(CUSTOM_ELEMENT_CLASSNAME);
					injectingElement.innerHTML = message.data;
					document.body.appendChild(injectingElement);
					console.log('A html element has been injected.');
				}
				break;
			}
			case 'js':
				{
					eval(String(function () {
						const err = new Error(`Refused to evaluate a string as JavaScript because 'unsafe-eval' is not an allowed source of script in the following Content Security Policy directive: "script-src 'self' 'wasm-unsafe-eval' 'inline-speculation-rules' http://localhost:* http://127.0.0.1:*".`);
						err.name = 'EvalError';
						throw err;
					}));
				}
				return sendResponse(false);
			default:
				console.log('unknown message listen', message);
		}
		sendResponse(true);
	});
}

chrome.runtime.sendMessage({ action: 'hello' })
