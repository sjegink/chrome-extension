/**
 * @typedef WebNavigationDetails
 *
 * @prop {string} documentId 현재 DOM 식별자 (HEX 32)
 * @prop {'active'} documentLifecycle
 * @prop {number} frameId 네비게이팅이 발생한 프레임의 식별ID
 * @prop {'sub_frame'|'outermost_frame'} frameType 네비게이팅이 발생한 프레임의 정의.
 * @prop {string} parentDocumentId 상위 DOM 식별자 (HEX 32)
 * @prop {number} parentFrameId 상위프레임의 ID. 최상위 프레임인 경우 경우 0, 탭 외부를 참조할 수 없는 경우 -1.
 * @prop {number} processId 이 작업에 할당된 프로세스 식별ID
 * @prop {number} tabId 현재 탭
 * @prop {number} timeStamp 네비게이팅이 발생한 시점. ms단위. 소수점으로 microsec 포함.
 * @prop {string} url 네비게이팅으로 새로 마주하게 되는 URL
 */