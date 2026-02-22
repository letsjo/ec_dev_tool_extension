/**
 * DevTools 페이지 로드 시 실행.
 * EC Dev Tool 패널을 생성하고 panel.html 을 연다.
 */
chrome.devtools.panels.create(
  "EC Dev Tool",
  "",
  "panel.html"
);
