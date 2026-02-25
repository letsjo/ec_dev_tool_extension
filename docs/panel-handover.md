# EC Dev Tool 인수인계 문서

이 문서는 `EC Dev Tool` 확장 프로그램을 처음 맡는 개발자가 코드 흐름을 빠르게 파악하고, 안전하게 수정/확장할 수 있도록 작성한 운영 문서입니다.

## 1. 프로젝트 목적

- DevTools 패널에서 inspected page의 개발용 객체 메서드를 호출한다.
- React 컴포넌트 트리/상세(props, hooks)와 선택 DOM 정보를 함께 보여준다.
- 페이지 런타임 변경(React commit) 시 패널 데이터를 자동 갱신한다.

## 2. 아키텍처 한눈에

런타임은 크게 4개 실행 컨텍스트로 나뉩니다.

1. DevTools panel context
- 파일: `src/features/panel/controller.ts`, `src/features/panel/bridge/**`, `src/features/panel/domTree/**`, `src/features/panel/reactInspector/**`, `src/features/panel/workspace/**`, `src/ui/sections/PanelViewSection.tsx`, `src/ui/sections/**`, `src/ui/panels/**`, `src/ui/components/**`
- 역할: UI 렌더링, 사용자 이벤트 처리, 데이터 조회 트리거

2. Background service worker
- 파일: `src/background.ts`
- 역할: panel ↔ content 메시지 중계, content script 미주입 탭 복구

3. Content script (isolated world)
- 파일: `src/content/elementPicker.ts`
- 역할: 요소 선택 오버레이, main world 스크립트 주입, pageAgent 브리지

4. Main world scripts (페이지 컨텍스트)
- 파일: `src/content/pageAgent.ts`, `src/content/pageAgentDom.ts`, `src/content/pageAgentBridge.ts`, `src/content/pageAgentMethods.ts`, `src/content/pageAgentHookGroups.ts`, `src/content/reactRuntimeHook.ts`
- 역할: React Fiber/DOM 실제 접근, commit 이벤트 감지

## 3. 빌드 결과와 엔트리 매핑

- 빌드 도구: `tsup` (`tsup.config.ts`)
- 산출물:
  - `dist/devtools.global.js` ← `src/features/devtools.ts`
  - `dist/panel.global.js` ← `src/features/panel.ts`
  - `dist/background.global.js` ← `src/background.ts`
  - `dist/content.global.js` ← `src/content/elementPicker.ts`
  - `dist/pageAgent.global.js` ← `src/content/pageAgent.ts`
  - `dist/reactRuntimeHook.global.js` ← `src/content/reactRuntimeHook.ts`

`manifest.json` 기준:

- `devtools_page`: `devtools.html`
- `background.service_worker`: `dist/background.global.js`
- `content_scripts`: `dist/content.global.js` (`document_start`)
- `web_accessible_resources`: `dist/pageAgent.global.js`, `dist/reactRuntimeHook.global.js`

## 4. 부트스트랩 흐름

1. `src/features/devtools.ts`
- `chrome.devtools.panels.create(...)`로 `panel.html` 탭 생성

2. `src/features/panel.ts`
- `runPanel()` 진입

3. `src/features/panel/controller.ts`
- `bootstrapPanel()` 호출
- 내부 순서:
  - `mountPanelView()`로 React UI 마운트
  - `initDomRefs()`로 필수 DOM 참조 수집
  - `bridge/pageAgentClient.ts` 유틸로 panel → background pageAgent 호출 브리지 위임
  - `domTree/renderer.ts` 유틸로 DOM 트리 노드 렌더링 위임
  - `reactInspector/signatures.ts`, `reactInspector/search.ts`, `reactInspector/jsonSection.ts` 유틸로 React 트리 시그니처/검색/상세(JSON/hook) 렌더 로직 위임
  - `workspace/manager.ts`의 `createWorkspaceLayoutManager(...)`로 스플릿/드래그/토글 상태머신 초기화
  - `workspace/wheelScrollFallback.ts`의 `initWheelScrollFallback(...)`로 스크롤 보정 리스너 설치
  - 이벤트 바인딩 후 `refreshReactRuntime(false)` 최초 실행

## 5. 메시지/브리지 흐름

### 5.1 Panel → Background → Content → PageAgent

패널에서 `bridge/pageAgentClient.ts`의 `callInspectedPageAgent(method, args, onDone)`를 호출하면:

1. panel이 `chrome.runtime.sendMessage({ action: "callPageAgent", ... })` 전송
2. background가 `ensureContentScript(tabId)`로 content 존재 보장
3. background가 content로 `callPageAgent` 재전송
4. content(`elementPicker.ts`)가 `window.postMessage` 브리지로 pageAgent 호출
5. pageAgent(`pageAgent.ts`)가 메서드 실행 후 응답
6. 응답이 역방향으로 panel까지 전달

### 5.2 요소 선택 흐름

1. panel의 `onSelectElement()`이 `startElementPicker` 요청
2. content가 오버레이 생성 및 hover/click 추적
3. 클릭 시 `elementSelected` 메시지 송신
4. panel `chrome.runtime.onMessage`에서 수신 후:
  - Selected Element/DOM Path UI 업데이트
  - `fetchDomTree(...)` 실행
  - `fetchReactInfo(..., { lightweight: true })` 실행

### 5.3 런타임 자동 갱신 흐름

1. main world `reactRuntimeHook.ts`가 `onCommitFiberRoot` 감지
2. content가 `pageRuntimeChanged` 메시지 송신(디바운스/스로틀 적용)
3. panel이 `scheduleRuntimeRefresh(true)` 호출
4. `refreshReactRuntime(true)`가 최소 간격 보장 후 경량 재조회

## 6. pageAgent 공개 메서드 계약

`src/content/pageAgentMethods.ts`의 `createPageAgentMethodExecutor(...)`가 method 라우팅 단일 진입점입니다.

- `ping`
- `fetchTargetData`
- `getDomTree`
- `highlightComponent`
- `clearComponentHighlight`
- `previewComponent`
- `clearHoverPreview`
- `reactInspect`
- `reactInspectPath`

`src/content/pageAgent.ts`는 브리지 라우팅/React inspect 중심 오케스트레이션을 담당하고,
DOM selector/path/트리/highlight/preview 구현은 `src/content/pageAgentDom.ts`로 위임합니다.
브리지 message 리스너 설치와 request/response 표준화는 `src/content/pageAgentBridge.ts`로 위임합니다.
method -> handler 라우팅(`ping`, `fetchTargetData`, `reactInspect` 등)은 `src/content/pageAgentMethods.ts`로 위임합니다.
custom hook stack 파싱/그룹 경로 추론은 `src/content/pageAgentHookGroups.ts`로 위임합니다.

새 메서드 추가 시:

1. `pageAgent.ts`에 구현 함수 추가
2. `pageAgentMethods.ts`의 method 라우터에 handler 연결
3. `controller.ts`에서 호출 및 타입 가드 연결
4. 필요하면 `src/shared/inspector/types.ts` 타입 확장

## 6.1 pageAgent DOM 모듈 분리 규칙

- `pageAgentDom.ts`: DOM selector/path 계산, DOM 트리 직렬화, component highlight/hover preview 상태 복원 전담
- `pageAgent.ts`: 요청 method 라우팅, React fiber 기반 inspect/path 처리 전담

## 6.2 pageAgent Bridge 모듈 분리 규칙

- `pageAgentBridge.ts`: window message 리스너 설치, request 검증, response 포맷/전송 전담
- `pageAgent.ts`: bridge 설치 호출과 도메인 핸들러 조립 전담

## 6.3 pageAgent Method Router 모듈 분리 규칙

- `pageAgentMethods.ts`: method 이름 -> 도메인 핸들러 라우팅, `fetchTargetData` 처리 전담
- `pageAgent.ts`: React inspect/domain 핸들러 구현체를 라우터에 주입하는 조립 전담

## 6.4 pageAgent Hook Group 모듈 분리 규칙

- `pageAgentHookGroups.ts`: hook stack frame 파싱, primitive hook 이름 정규화, custom hook group/path 추론 전담
- `pageAgent.ts`: fiber 순회/serializer/inspect 오케스트레이션에서 group metadata 적용 전담

## 7. 워크스페이스(패널 스플릿) 모델

핵심 파일:

- `src/features/panel/workspacePanels.ts`
- `src/features/panel/controller.ts`
- `src/features/panel/workspace/layoutModel.ts`
- `src/features/panel/workspace/manager.ts`
- `src/features/panel/workspace/storage.ts`
- `src/features/panel/workspace/wheelScrollFallback.ts`
- `panel.html` (레이아웃 CSS)

핵심 개념:

1. 패널 ID 소스 오브 트루스
- `WORKSPACE_PANEL_ID_LIST` / `WORKSPACE_PANEL_CONFIG`

2. 레이아웃 트리
- `WorkspaceLayoutNode = panel | split`
- split은 `axis(row|column)`, `ratio`, `first`, `second` 보유

3. 패널 상태
- `WorkspacePanelState = "visible" | "closed"`

4. 영속화 키(localStorage)
- `ecDevTool.workspaceLayout.v1`
- `ecDevTool.workspacePanelState.v1`

5. 렌더 전략
- `renderWorkspaceLayout()`가 패널 상태 반영 → DOM patch → 접힘 높이/스크롤 복원
- 접힌 패널 높이는 `--workspace-panel-summary-height` 기반 계산

## 7.1 워크스페이스 모듈 분리 규칙

- `layoutModel.ts`: 레이아웃 트리 모델/정규화/삽입/교체/비율 계산 같은 순수 로직
- `manager.ts`: 워크스페이스 DOM patch 렌더, 드래그/드롭, 리사이즈, 상태 영속화 오케스트레이션
- `storage.ts`: 워크스페이스 localStorage read/write 유틸
- `wheelScrollFallback.ts`: 패널 wheel capture 보정 리스너 설치/해제
- `controller.ts`: DOM ref/렌더 파이프라인/이벤트 오케스트레이션만 담당

## 7.2 React Inspector 모듈 분리 규칙

- `reactInspector/signatures.ts`: 컴포넌트 상세/목록 렌더 시그니처, 런타임 변경 감지 fingerprint 계산 전담
- `reactInspector/search.ts`: 검색 텍스트 생성, 필터링, 조상 경로 확장, 접힘 상태 스냅샷/복원 유틸 전담
- `reactInspector/jsonSection.ts`: props/hooks JSON 트리 렌더, 함수 inspect 링크, dehydrated 값 지연 조회/확장 렌더 전담
- `controller.ts`: panel 상태(`reactComponents`, `collapsedComponentIds`, `componentSearchTexts`)를 보유하고 위 유틸을 호출해 UI 오케스트레이션만 수행

## 7.3 DOM Tree 모듈 분리 규칙

- `domTree/renderer.ts`: DOM 노드 라벨 생성(`<tag>`, `</tag>`)과 트리 `<details>` 렌더링 전담
- `controller.ts`: pageAgent 조회/오류 처리/상태 문구 갱신과 결과 적용 오케스트레이션 전담

## 7.4 Panel Bridge 모듈 분리 규칙

- `bridge/pageAgentClient.ts`: panel -> background 메시지 전송, 공통 에러 처리, 응답 표준화 전담
- `controller.ts`: 비즈니스 흐름에 맞는 method/args 구성과 후속 UI 상태 업데이트 전담

## 8. 주요 UI 구성 파일 역할

- `src/ui/sections/PanelViewSection.tsx`
  - UI 조립 전용 최상위 섹션 컴포넌트
  - `PanelHeaderSection`, `PanelWorkspaceSection`을 조합해 패널 골격을 구성

- `src/ui/components/**`
  - 재사용 가능한 작은 단위 컴포넌트
  - 버튼/서브타이틀/공통 패널 래퍼처럼 데이터 조회 없이 UI 표현만 담당

- `src/ui/panels/**`
  - 단독으로 렌더 가능한 완성 패널 컴포넌트
  - 각 파일이 하나의 패널(예: `ComponentsInspectorPanel`)을 완성하며, 고유 panel id/본문 DOM id를 포함

- `src/ui/sections/**`
  - 화면 조립/레이아웃 전용 섹션 컴포넌트
  - `PanelHeaderSection`, `PanelWorkspaceSection`, `WorkspaceCanvasSection`, `WorkspacePanelsSection`으로 화면 계층을 구성
  - `WorkspacePanelsSection`에서 패널 등록 순서와 레이아웃 구성을 일관되게 유지

- `panel.html`
  - 모든 스타일 정의
  - `.workspace-split`, `.workspace-panel`, `.components-pane-body` 레이아웃 동작 정의
  - Selected Element / DOM Path / Selected DOM Tree / Raw Result의 스크롤/배경/최소높이 제어

- `src/features/panel/controller.ts`
  - 브리지/조회/선택/렌더 상위 오케스트레이션의 핵심
  - workspace 렌더/이벤트 상태머신은 `workspace/manager.ts`에 위임하고, wheel 보정은 `workspace/wheelScrollFallback.ts`를 사용

## 9. 디버깅 체크리스트

1. 패널이 비거나 멈춘 경우
- DevTools 콘솔에서 `[EC Dev Tool] panel bootstrap failed` 로그 확인
- `panel.html`의 `#root` 렌더 여부 확인

2. 요소 선택이 시작되지 않는 경우
- background에서 `ensureContentScript` 오류 여부 확인
- `chrome.runtime.lastError` 메시지 확인

3. React 트리가 비는 경우
- 대상 페이지가 React Fiber 노출 가능한 환경인지 확인
- `reactInspect` 응답 구조를 `isReactInspectResult`로 통과하는지 확인

4. 자동 갱신이 과도하거나 느린 경우
- `RUNTIME_REFRESH_MIN_INTERVAL_MS`, `RUNTIME_REFRESH_DEBOUNCE_MS` 값 점검
- `elementPicker.ts`의 notify throttle 값과 함께 조정

5. DOM 트리 렌더가 무거운 경우
- `pageAgent.ts`의 직렬화 제한(`MAX_DEPTH`, `MAX_CHILDREN_PER_NODE`) 점검

## 10. 변경 시 권장 절차

1. 기능 변경 전
- `npm run build`가 깨끗하게 통과하는지 확인

2. 변경 후
- 최소 시나리오 수동 검증:
  - 패널 열기
  - Select element 클릭/취소/선택
  - 컴포넌트 선택 시 하이라이트 + DOM Tree 갱신
  - 패널 접기/펼치기/닫기/다시 열기
  - 패널 경계 드래그 및 페이지 이동 후 자동 갱신

3. 릴리즈 전
- `manifest.json`, `tsup.config.ts`의 엔트리/리소스 경로 불일치 여부 확인

## 10.1 문서 동기화 운영 규칙

이 저장소는 코드 변경 시 문서/주석을 함께 업데이트하는 정책을 사용합니다.

1. 구조/동작 변경
- `docs/panel-handover.md` 동기화

2. 사용자 사용법/설정 변경
- `README.md` 동기화

3. 복잡 로직 변경
- 변경 파일 인라인 주석 보강

정식 규칙은 저장소 루트 `AGENTS.md`를 기준으로 따릅니다.

## 11. 빠른 확장 가이드

### 새 워크스페이스 패널 추가

1. `src/features/panel/workspacePanels.ts`에 panel id/config 추가
2. 필요 시 `src/features/panel/workspace/layoutModel.ts`의 `createDefaultWorkspaceLayout()` 기본 트리 반영
3. `src/features/panel/workspace/manager.ts`의 이벤트/렌더 파이프라인에서 신규 패널 동작 경로 확인
4. `src/ui/panels/`에 새 패널 컴포넌트 파일 추가
5. `src/ui/panels/index.ts` export 등록
6. `src/ui/sections/WorkspacePanelsSection.tsx` 조립 목록에 추가
7. `controller.ts`에서 필요한 DOM ref/getRequiredElement 추가
8. `panel.html`에서 필요 스타일 추가

### 새 pageAgent 메서드 추가

1. `pageAgent.ts`에 함수 작성
2. `pageAgentMethods.ts` 라우터 case에 메서드/핸들러 연결
3. `controller.ts`에서 `callInspectedPageAgent` 호출 경로 추가
4. `types.ts`/`guards.ts`에 응답 타입과 검증기 추가
5. 실패/성공 UI 문구(`setReactStatus`, `setDomTreeStatus`) 정리

---

관련 파일 바로가기:

- `src/features/panel/controller.ts`
- `src/features/panel/bridge/pageAgentClient.ts`
- `src/features/panel/domTree/renderer.ts`
- `src/features/panel/reactInspector/signatures.ts`
- `src/features/panel/reactInspector/search.ts`
- `src/features/panel/reactInspector/jsonSection.ts`
- `src/features/panel/workspace/layoutModel.ts`
- `src/features/panel/workspace/manager.ts`
- `src/features/panel/workspace/storage.ts`
- `src/features/panel/workspace/wheelScrollFallback.ts`
- `src/ui/sections/PanelViewSection.tsx`
- `src/ui/sections/WorkspacePanelsSection.tsx`
- `src/ui/components/WorkspacePanel.tsx`
- `src/ui/panels/index.ts`
- `src/features/panel/workspacePanels.ts`
- `src/content/elementPicker.ts`
- `src/content/pageAgent.ts`
- `src/content/pageAgentDom.ts`
- `src/content/pageAgentBridge.ts`
- `src/content/pageAgentMethods.ts`
- `src/content/pageAgentHookGroups.ts`
- `src/content/reactRuntimeHook.ts`
- `src/background.ts`
- `panel.html`
