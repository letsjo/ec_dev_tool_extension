/**
 * 패널 ↔ 콘텐츠 스크립트 메시지 중계.
 * Select element 시 content script가 찍은 요소 정보를 패널로 전달.
 */

import { createBackgroundMessageListener } from './background/messageRouter';

chrome.runtime.onMessage.addListener(createBackgroundMessageListener());
