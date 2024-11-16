// 아하포인트1. 팝업 닫고 다시 열 때마다 html이 새로 랜더링된다.

window.onload = async () => {
	// const libMappings = {
	// 	'sample': [
	// 		{
	// 			label: 'bool!',
	// 			values: null,
	// 		},
	// 		{
	// 			label: 'array!',
	// 			values: ['a', 'b', 'c']
	// 		}],
	// };
	const libMappings = await sendMessage();
	Object
		.entries(libMappings)
		.forEach(([libName, mappings]) => {
			mappings = [mappings].flat();
			mappings.forEach((mapping, key) => {
				const { label, values, value: defaultValue } = mapping;
				if (Array.isArray(values) === false) return createListItem(libName, key, label, Boolean, defaultValue);
				else return createListItem(libName, key, label, values, defaultValue);
			});
		});
}

async function onClick(el) {
	const libName = el.getAttribute('data-libname');
	const key = el.getAttribute('data-key');
	const max = Number(el.getAttribute('data-max'));
	let value = Number(el.getAttribute('data-value')) || 0;
	value = (value + 1) % ((max || 1) + 1);
	await sendMessage(libName, key, value);
	el.setAttribute('data-value', value);
	refreshValueText(el);
}

/**
 * @param {string} [key]
 * @param {any} [value]
 */
async function sendMessage(...args) {
	const payload = { identify: 'sjegink.chromeExtensionAPI' };
	if (0 < args.length) payload.libName = args[0];
	if (1 < args.length) payload.key = args[1];
	if (2 < args.length) payload.value = args[2];
	return new Promise(resolve => {
		chrome.runtime.sendMessage(payload, resolve);
	});
}

const valuesMap = new Map();
function createListItem(libName, key, label, values, defaultValue) {
	if (!Array.isArray(values)) {
		values = null;
	}
	const elSample = document.querySelector('li.sample');
	const el = elSample.cloneNode(true);
	el.addEventListener('click', ev => onClick(el));
	el.addEventListener('dblclick', ev => onClick(el));
	el.addEventListener('selectstart', ev => false);
	el.classList.remove('sample');
	Object.entries({
		'data-libname': libName,
		'data-key': key,
		'data-value': defaultValue ?? 0,
		'data-max': values && values.length - 1,
	}).forEach(([k, v]) => {
		k = k.replace(/[A-Z]/g, c => `-${c}`);
		v != null ? el.setAttribute(k, v) : el.removeAttribute(k);
	});
	// label
	(child => {
		child.innerHTML = label;
		child.onselectstart = ev => false;
	})(el.querySelector('label'));
	// values
	if (Array.isArray(values)) {
		valuesMap.set(key, values);
		refreshValueText(el);
	} else {
		valuesMap.delete(key);
	}
	elSample.parentNode.appendChild(el);
	return el;
}

function refreshValueText(el) {
	const key = el.getAttribute('data-key');
	const values = valuesMap.get(key) ?? [''];
	if (el.getAttribute('data-max') != null) {
		const i = Number(el.getAttribute('data-value')) || 0;
		const text = values[i] ?? values[0];
		el.querySelector('.text').innerHTML = text;
	}

}