# EC Dev Tool 인수인계 문서

이 문서는 `EC Dev Tool` 확장 프로그램을 처음 맡는 개발자가 코드 흐름을 빠르게 파악하고, 안전하게 수정/확장할 수 있도록 작성한 운영 문서입니다.

## 1. 프로젝트 목적

- DevTools 패널에서 inspected page의 개발용 객체 메서드를 호출한다.
- React 컴포넌트 트리/상세(props, hooks)와 선택 DOM 정보를 함께 보여준다.
- 페이지 런타임 변경(React commit) 시 패널 데이터를 자동 갱신한다.

## 2. 아키텍처 한눈에

런타임은 크게 4개 실행 컨텍스트로 나뉩니다.

1. DevTools panel context
- 파일: `src/features/panel/controller.ts`, `src/features/panel/controller/wiring/controllerWiring.ts`, `src/features/panel/controller/wiring/controllerWiringDataFlows.ts`, `src/features/panel/controller/wiring/controllerWiringReactInspector.ts`, `src/features/panel/controller/wiring/controllerWiringLifecycle.ts`, `src/features/panel/controller/context.ts`, `src/features/panel/controller/runtime.ts`, `src/features/panel/controller/bootstrap.ts`, `src/features/panel/devtoolsNetworkBridge.ts`, `src/features/panel/domRefs.ts`, `src/features/panel/bridge/**`, `src/features/panel/domTree/**`, `src/features/panel/pageAgent/**`, `src/features/panel/reactInspector/**`, `src/features/panel/runtimeRefresh/**`, `src/features/panel/workspace/**`, `src/ui/sections/shell/PanelViewSection.tsx`, `src/ui/sections/**`, `src/ui/panels/**`, `src/ui/components/**`
- 역할: UI 렌더링, 사용자 이벤트 처리, 데이터 조회 트리거

2. Background service worker
- 파일: `src/background.ts`, `src/background/router/messageRouter.ts`, `src/background/router/contentScriptBridge.ts`, `src/background/errors/messageErrors.ts`, `src/background/relay/runtimeRelay.ts`, `src/background/router/runtimeMessageTypes.ts`
- 역할: panel ↔ content 메시지 중계, content script 미주입 탭 복구

3. Content script (isolated world)
- 파일: `src/content/elementPicker.ts`, `src/content/elementPickerOverlay.ts`, `src/content/elementPickerBridge.ts`, `src/content/elementPickerPageAgentClient.ts`, `src/content/elementSelectorInfo.ts`, `src/content/runtimeMessaging.ts`
- 역할: 요소 선택 오버레이/하이라이트 상태(선택 중 pointer/click/contextmenu/Escape 이벤트 consume 포함), runtime hook/pageAgent 브리지 상태, 선택 element selector/path 정보 계산, runtime 메시지 안전 전송 유틸

4. Main world scripts (페이지 컨텍스트)
- 파일: `src/content/pageAgent.ts`, `src/content/pageAgentRuntime.ts`, `src/content/pageAgentRuntimeBootstrap.ts`, `src/content/runtime/pageAgentRuntimeConfig.ts`, `src/content/runtime/pageAgentRuntimeDomHandlers.ts`, `src/content/runtime/pageAgentRuntimeInspectHandlers.ts`, `src/content/runtime/pageAgentRuntimeTypes.ts`, `src/content/dom/pageAgentDom.ts`, `src/content/dom/pageAgentDomSelectors.ts`, `src/content/dom/pageAgentDomTree.ts`, `src/content/dom/pageAgentDomHighlight.ts`, `src/content/dom/pageAgentDomHighlightState.ts`, `src/content/pageAgentBridge.ts`, `src/content/pageAgentBridgeMessages.ts`, `src/content/pageAgentMethods.ts`, `src/content/pageAgentTargetFetch.ts`, `src/content/pageAgentHookGroups.ts`, `src/content/pageAgentHookGroupRuntimeContext.ts`, `src/content/pageAgentHookStack.ts`, `src/content/pageAgentHookGrouping.ts`, `src/content/pageAgentHookGroupingAncestor.ts`, `src/content/pageAgentHookGroupingPath.ts`, `src/content/pageAgentHookGroupingPrimitive.ts`, `src/content/pageAgentHookRuntime.ts`, `src/content/pageAgentHookResult.ts`, `src/content/pageAgentHookMetadataBuild.ts`, `src/content/hooks/inspect/pageAgentHookPrimitiveStack.ts`, `src/content/hooks/inspect/pageAgentHookInspectContext.ts`, `src/content/hooks/inspect/pageAgentHookInspectRender.ts`, `src/content/hooks/inspect/pageAgentHookRenderExecution.ts`, `src/content/hooks/inspect/pageAgentHookDispatcher.ts`, `src/content/hooks/inspect/pageAgentHookDispatcherTypes.ts`, `src/content/hooks/inspect/pageAgentHookDispatcherState.ts`, `src/content/hooks/inspect/pageAgentHookDispatcherMethodTypes.ts`, `src/content/hooks/inspect/pageAgentHookDispatcherMethodContextState.ts`, `src/content/hooks/inspect/pageAgentHookDispatcherMethodEffects.ts`, `src/content/hooks/inspect/pageAgentHookDispatcherMethodComputed.ts`, `src/content/hooks/inspect/pageAgentHookDispatcherMethods.ts`, `src/content/pageAgentHookState.ts`, `src/content/pageAgentHookMetadata.ts`, `src/content/pageAgentHooksInfo.ts`, `src/content/pageAgentInspect.ts`, `src/content/pageAgentInspectTypes.ts`, `src/content/pageAgentInspectFlowWiring.ts`, `src/content/pageAgentInspectSelection.ts`, `src/content/inspect/path/pageAgentInspectPathArgs.ts`, `src/content/inspect/path/pageAgentInspectPathValue.ts`, `src/content/inspect/path/pageAgentInspectPathMode.ts`, `src/content/inspect/path/pageAgentInspectPathFlow.ts`, `src/content/inspect/components/pageAgentInspectComponentsArgs.ts`, `src/content/inspect/components/pageAgentInspectComponentsSource.ts`, `src/content/inspect/components/pageAgentInspectComponentsRoot.ts`, `src/content/inspect/components/pageAgentInspectComponentsWalkContext.ts`, `src/content/inspect/components/pageAgentInspectComponentsResult.ts`, `src/content/inspect/components/pageAgentInspectComponentsFlow.ts`, `src/content/pageAgentInspectDomInfo.ts`, `src/content/pageAgentInspectTarget.ts`, `src/content/pageAgentInspectComponentWalk.ts`, `src/content/pageAgentFiberSearch.ts`, `src/content/pageAgentFiberSearchTypes.ts`, `src/content/pageAgentFiberSearchTree.ts`, `src/content/pageAgentFiberSearchDomScan.ts`, `src/content/pageAgentFiberElement.ts`, `src/content/pageAgentFiberDescribe.ts`, `src/content/pageAgentFiberRegistry.ts`, `src/content/serialization/pageAgentSerialization.ts`, `src/content/serialization/pageAgentSerializationValue.ts`, `src/content/serialization/pageAgentSerializationValuePrimitives.ts`, `src/content/serialization/pageAgentSerializationProps.ts`, `src/content/serialization/pageAgentSerializationPropsBudget.ts`, `src/content/serialization/pageAgentSerializationPropsEntries.ts`, `src/content/serialization/pageAgentSerializationCore.ts`, `src/content/serialization/pageAgentSerializationCoreInternalKey.ts`, `src/content/serialization/pageAgentSerializationCoreDehydrated.ts`, `src/content/serialization/pageAgentSerializationCoreSeenStore.ts`, `src/content/serialization/pageAgentSerializationStrategies.ts`, `src/content/serialization/pageAgentSerializationStrategyTypes.ts`, `src/content/serialization/pageAgentSerializationCollectionStrategies.ts`, `src/content/serialization/pageAgentSerializationObjectStrategy.ts`, `src/content/serialization/pageAgentCollectionPath.ts`, `src/content/serialization/pageAgentSerializerSummary.ts`, `src/content/serialization/pageAgentSerializerOptions.ts`, `src/content/reactRuntimeHook.ts`, `src/content/reactRuntimeHookLifecycle.ts`
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
  - `pageAgent/responsePipeline.ts` 유틸로 pageAgent 응답 오류/형식 검증과 상태 반영 파이프라인 위임
  - `pageAgent/selectionSync.ts` 유틸로 선택 컴포넌트 DOM 하이라이트/Selected Element·DOM Tree 동기화 위임
  - `elementPicker/bridgeFlow.ts` 유틸로 요소 선택 시작 액션과 runtime 메시지 분기(elementPickerStopped/pageRuntimeChanged/elementSelected) 위임
  - `domRefs.ts` 유틸로 PanelView 마운트(`mountPanelView`)와 필수 DOM ref 수집(`initPanelDomRefs`) 위임
  - `controllerWiring.ts` 유틸로 pane/target/dom/react/runtime/bootstrap 결선 조립 책임 위임
  - `devtoolsNetworkBridge.ts` 유틸로 inspected tab id 조회와 network.onNavigated listener add/remove 결선 책임 위임
  - `controller/context.ts` 유틸로 panel DOM ref/picker 상태/workspace lifecycle 핸들 저장·조회 책임 위임
  - `controller/runtime.ts` 유틸로 runtime refresh + element picker bridge + runtime message listener + teardown 결선 책임 위임
  - `controller/bootstrap.ts` 유틸로 workspace 초기화 결선 + bootstrap flow 결선 책임 위임
  - `lifecycle/bootstrapFlow.ts`, `lifecycle/panelWorkspaceInitialization.ts`, `lifecycle/runtimeMessageBinding.ts` 유틸로 패널 부트스트랩 순서(마운트/초기 문구/이벤트 바인딩), workspace/wheel 초기화 결선, runtime message listener 결선/해제 위임
  - `targetFetch/flow.ts` 유틸로 Raw Result 패널의 target 목록 렌더링과 `fetchTargetData` 요청/응답 문구 반영 위임
  - `paneState.ts`, `paneSetters.ts` 유틸로 패널 텍스트/empty/error 클래스 토글 규칙과 pane setter 결선 위임
  - `domTree/renderer.ts`, `domTree/fetchFlow.ts` 유틸로 DOM 트리 노드 렌더링과 getDomTree 조회/응답 상태 반영, 최신 요청 id 기반 stale 응답 차단 플로우 위임
  - `reactInspector/signatures.ts`, `reactInspector/signatureHash.ts`, `reactInspector/signatureBuilders.ts`, `reactInspector/search/index.ts`, `reactInspector/search/searchTextCache.ts`, `reactInspector/search/searchFilter.ts`, `reactInspector/resultModel.ts`, `reactInspector/applyFlow.ts`, `reactInspector/fetchOptions.ts`, `reactInspector/flow/fetchFlow.ts`, `reactInspector/flow/inspectDataStage.ts`, `reactInspector/lookup.ts`, `reactInspector/openInSources.ts`, `reactInspector/path/pathActions.ts`, `reactInspector/path/pathBindings.ts`, `reactInspector/path/pathCompletion.ts`, `reactInspector/path/pathFailure.ts`, `reactInspector/path/pathOpenAction.ts`, `reactInspector/path/pathRequest.ts`, `reactInspector/path/pathRequestCompletion.ts`, `reactInspector/path/pathRequestRunner.ts`, `reactInspector/path/pathResponse.ts`, `reactInspector/collectionDisplay.ts`, `reactInspector/collectionDisplayMeta.ts`, `reactInspector/collectionDisplayTokenNormalize.ts`, `reactInspector/hookTreeTypes.ts`, `reactInspector/hookTreeNormalization.ts`, `reactInspector/hookTreeBuilders.ts`, `reactInspector/hookTreeModel.ts`, `reactInspector/jsonTokenNodes.ts`, `reactInspector/preview/jsonCollectionPreview.ts`, `reactInspector/preview/jsonPreviewCollection.ts`, `reactInspector/preview/jsonObjectPreview.ts`, `reactInspector/jsonObjectArraySummary.ts`, `reactInspector/jsonObjectArrayChildren.ts`, `reactInspector/preview/jsonPreviewPrimitive.ts`, `reactInspector/preview/jsonPreviewObjectMeta.ts`, `reactInspector/preview/jsonPreviewTokenStrategies.ts`, `reactInspector/preview/jsonPreviewBudget.ts`, `reactInspector/preview/jsonPreview.ts`, `reactInspector/jsonDehydratedNode.ts`, `reactInspector/jsonObjectArrayNode.ts`, `reactInspector/jsonRowUi.ts`, `reactInspector/jsonRefMap.ts`, `reactInspector/jsonHookTreeRenderer.ts`, `reactInspector/search/searchStatus.ts`, `reactInspector/controllerState.ts`, `reactInspector/controllerStateModel.ts`, `reactInspector/controllerDerivations.ts`, `reactInspector/controllerFlowTypes.ts`, `reactInspector/controllerFlowInteractionWiring.ts`, `reactInspector/controllerFlows.ts`, `reactInspector/search/searchInputFlow.ts`, `reactInspector/viewState.ts`, `reactInspector/selection/index.ts`, `reactInspector/selection/selectionModel.ts`, `reactInspector/list/listTreeModel.ts`, `reactInspector/list/listTreeScrollAnchor.ts`, `reactInspector/list/listTreeRenderer.ts`, `reactInspector/detail/detailRenderer.ts`, `reactInspector/detail/detailApply.ts`, `reactInspector/jsonSection.ts` 유틸로 React 트리 시그니처/검색/컴포넌트 정규화·변경감지/apply 옵션 정규화·접힘복원·후속 액션 결정/fetch 옵션·프리셋 조립/reactInspect fetch request-response stage 오케스트레이션/reactInspect data stage(이전 선택/접힘 스냅샷 + 결과 모델 적용) 계산/lookup 저장·refresh lookup 계산·inspectPath fallback/devtools inspect eval expression 조립·실패 판정·상태 문구 규칙/inspectFunction·serializeValue completion 후처리(action/value) 규칙/inspectFunction/serializeValue 액션 핸들러 오케스트레이션/inspectPath request-open-action bindings 조립/function inspect open action(eval 실행 + 상태 문구) 오케스트레이션/inspectPath 실패 유형 정규화·상태 문구 규칙/inspectPath 호출 args(selector/pickPoint/mode/serializeLimit) 조립/inspectPath 요청 completion을 판별 유니온(`success`/`failure`)으로 정규화하고 success/failure 타입가드 제공/inspectPath request runner 생성(브리지 호출 + completion 반환)/inspectPath 성공 payload 파싱/시그니처 value hash 계산과 detail/update/list 빌더 분리/collection token(map/set) display path/meta 정규화 + token normalize/meta/path 역매핑 책임 분리/hook row 정규화 + explicit/fallback 트리 빌드 전략 분리/function/circular token 노드 렌더 규칙/collection token + display collection meta(map/set) preview 공통 빌더 + summary/hook collection limit 프리셋 분리/object/array preview 공통 빌더 + object/array details summary meta/preview 계산 분리 + object/array children row 렌더(helper)/JSON/hook summary preview 문자열 빌더(primitive/object/collection/dehydrated) 규칙/controller state read-write snapshot 분리/controller mutable model + update writer 분리/controller 파생 계산/검색 캐시 갱신/JSON 섹션 조립 결선 분리/controller interaction 결선(list/detail/search/selection/detailQueue)과 fetch/reset/apply 결선 분리/dehydrated token lazy expand + runtime serialize refresh 렌더 규칙/object/array details summary+lazy children 렌더 규칙/JSON row toggle button/spacer/expandable key-value row UI 렌더 규칙/ref id 역참조 맵 수집 규칙/hook tree DOM row/group 재귀 렌더 규칙/검색 텍스트 캐시 생성/부분 갱신/길이 보정 분리 및 검색 필터/조상 확장 분리/검색 상태 문구/검색 입력 이벤트 후속 처리/placeholder 상태/선택 시퀀스/선택 인덱스 계산/컴포넌트 트리 모델 계산 + 스크롤 앵커 캡처/복원 분리/상세 패널 DOM 렌더 캐시/상세 응답 병합/상세(JSON/hook) 렌더 로직 위임
- `controllerWiring.ts`는 pane + data flow + react inspector + lifecycle 결선을 조립하고 controller에는 bootstrap 핸들만 반환
- `controllerWiringDataFlows.ts`는 target fetch + DOM tree fetch + selection sync 결선을 조립해 `controllerWiring.ts`의 fetch/selection 책임을 축소
- `controllerWiringReactInspector.ts`는 reactInspect path binding + controller flow 결선을 조립해 `controllerWiring.ts`의 책임을 축소
- `controllerWiringLifecycle.ts`는 runtime refresh + bootstrap 결선을 조립하고 fetch option preset/listener/초기 refresh 트리거를 고정한다.
  - `reactInspector/detail/detailFetchQueue.ts`, `reactInspector/detail/detailFetchQueueState.ts`, `reactInspector/detail/detailFetchQueueResponse.ts`, `reactInspector/detail/detailFetchQueueMessages.ts` 유틸로 선택 컴포넌트 상세 지연조회 큐(in-flight/queue/cooldown), 응답 정규화, 실패 문구 규칙 helper 위임
  - `runtimeRefresh/scheduler.ts` 유틸로 runtime 변경 debounce/최소 간격/in-flight 큐 병합 스케줄링 위임
  - `workspace/manager.ts`의 `createWorkspaceLayoutManager(...)`로 스플릿/드래그/토글 상태머신 초기화
  - `workspace/managerLifecycle.ts` 유틸로 workspace init/destroy 순서(restore→bind→observer→render, teardown) 위임
  - `workspace/managerInteractionFlowWiring.ts` 유틸로 drag/drop+resize+action flow 결선과 lifecycle delegate 조립 위임
  - `workspace/wheelScrollFallback.ts`의 `initWheelScrollFallback(...)`로 스크롤 보정 리스너 설치
  - 이벤트 바인딩 후 runtime scheduler로 최초 React 런타임 조회 실행

## 5. 메시지/브리지 흐름

### 5.1 Panel → Background → Content → PageAgent

패널에서 `bridge/pageAgentClient.ts`의 `callInspectedPageAgent(method, args, onDone)`를 호출하면:

1. panel이 `chrome.runtime.sendMessage({ action: "callPageAgent", ... })` 전송
2. background가 `ensureContentScript(tabId)`로 content 존재 보장
3. background가 content로 `callPageAgent` 재전송
4. content(`elementPicker.ts`, `elementPickerBridge.ts`, `elementPickerPageAgentClient.ts`)가 `window.postMessage` 브리지로 pageAgent 호출
5. pageAgent(`pageAgent.ts`)가 메서드 실행 후 응답
6. 응답이 역방향으로 panel까지 전달

- content 브리지의 request timeout/pending request cleanup은 `elementPickerPageAgentClient.ts`가 전담한다.
- `elementPickerBridge.ts`는 pageAgent 스크립트 주입 성공 시점(`onload`)에만 injected 플래그를 고정하고, `onerror`에서는 false를 유지해 재주입(재시도) 경로를 보장한다.

### 5.2 요소 선택 흐름

1. panel의 `onSelectElement()`이 `startElementPicker` 요청
2. content가 오버레이 생성 및 hover/click 추적
  - 오버레이가 pointer/mouse/contextmenu/Escape 이벤트를 consume해 페이지 DOM 이벤트 부작용을 최소화
3. 클릭 시 `elementSelected` 메시지 송신
4. panel `chrome.runtime.onMessage`에서 수신 후:
  - Selected Element/DOM Path UI 업데이트
  - `fetchDomTree(...)` 실행
  - `fetchReactInfo(..., { lightweight: true })` 실행
  - `fetchDomTree`/`fetchReactInfo`는 latest request id 비교로 늦게 도착한 이전 응답을 폐기해 트리/선택 상태 역전을 방지

### 5.3 런타임 자동 갱신 흐름

1. main world `reactRuntimeHook.ts`가 `reactRuntimeHookLifecycle.ts`를 통해 `onCommitFiberRoot` 감지 래퍼 설치
2. content가 `pageRuntimeChanged` 메시지 송신(디바운스/스로틀 적용)
3. panel이 `runtimeRefresh/scheduler.ts`의 `schedule(true)` 호출
4. scheduler가 최소 간격을 보장해 경량 React 재조회를 실행

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

`src/content/pageAgent.ts`는 중복 설치 방지와 runtime bootstrap 엔트리를 담당하고,
실제 브리지/메서드 라우터/도메인 핸들러 조립은 `src/content/pageAgentRuntime.ts`가 담당합니다.
React inspect/inspectPath 오케스트레이션은 `src/content/pageAgentInspect.ts`로 위임합니다.
componentId 기반 root/fiber 탐색은 `src/content/pageAgentFiberSearch.ts`로 위임합니다.
DOM element에서 React fiber 추적(`__reactFiber$`, `__reactContainer$`) 유틸은 `src/content/pageAgentFiberElement.ts`로 위임합니다.
fiber name/tag/선택 대상 계산 유틸은 `src/content/pageAgentFiberDescribe.ts`로 위임합니다.
fiber stable id map/function inspect registry 관리는 `src/content/pageAgentFiberRegistry.ts`로 위임합니다.
값 직렬화 public export 배럴은 `src/content/serialization/pageAgentSerialization.ts`로, value serializer 오케스트레이션(`makeSerializer`)은 `src/content/serialization/pageAgentSerializationValue.ts`로, primitive/special-object probe는 `src/content/serialization/pageAgentSerializationValuePrimitives.ts`로, fiber props 직렬화 오케스트레이션은 `src/content/serialization/pageAgentSerializationProps.ts`로, fiber props budget 결정은 `src/content/serialization/pageAgentSerializationPropsBudget.ts`로, fiber props key loop 직렬화는 `src/content/serialization/pageAgentSerializationPropsEntries.ts`로, serializer core helper(내부키 매핑/순환참조 저장소/dehydrated 토큰/클래스명 판별)는 `src/content/serialization/pageAgentSerializationCore.ts`로, serializer 옵션 정규화는 `src/content/serialization/pageAgentSerializerOptions.ts`로, children/type summary 요약은 `src/content/serialization/pageAgentSerializerSummary.ts`로, collection path token 해석은 `src/content/serialization/pageAgentCollectionPath.ts`로 위임합니다.
hook 이름 추론/Ref 상태 정규화는 `src/content/pageAgentHookState.ts`로 위임합니다.
custom hook metadata 병합은 `src/content/pageAgentHookMetadata.ts`로 위임합니다.
fiber hook linked-list 정규화/개수 집계/직렬화 payload 구성은 `src/content/pageAgentHooksInfo.ts`로 위임합니다.
DOM selector/path 계산은 `src/content/dom/pageAgentDom.ts`로, DOM tree 직렬화는 `src/content/dom/pageAgentDomTree.ts`로, highlight/preview 상태 복원·적용은 `src/content/dom/pageAgentDomHighlight.ts`로 위임합니다.
브리지 message 리스너 설치와 request/response 표준화는 `src/content/pageAgentBridge.ts`로 위임합니다.
method -> handler 라우팅(`ping`, `fetchTargetData`, `reactInspect` 등)은 `src/content/pageAgentMethods.ts`로 위임합니다.
custom hook stack 파싱 유틸은 `src/content/pageAgentHookStack.ts`로, group path 추론 유틸은 `src/content/pageAgentHookGrouping.ts`로, dispatcher/ref/render 대상 해석 유틸은 `src/content/pageAgentHookRuntime.ts`로, hook dispatcher 타입/상태/메서드 구성 유틸은 `src/content/hooks/inspect/pageAgentHookDispatcherTypes.ts`/`src/content/hooks/inspect/pageAgentHookDispatcherState.ts`/`src/content/hooks/inspect/pageAgentHookDispatcherMethods.ts`로, dispatcher 조립/Proxy fallback 유틸은 `src/content/hooks/inspect/pageAgentHookDispatcher.ts`로, inspect dispatcher/state+warmup cache 조립 유틸은 `src/content/hooks/inspect/pageAgentHookInspectContext.ts`로, render pass 조립 유틸은 `src/content/hooks/inspect/pageAgentHookInspectRender.ts`로, dispatcher 교체/console mute/render 실행 유틸은 `src/content/hooks/inspect/pageAgentHookRenderExecution.ts`로, 전체 오케스트레이션은 `src/content/pageAgentHookGroups.ts`로 위임합니다.

새 메서드 추가 시:

1. 도메인에 맞는 모듈(`pageAgentRuntime.ts`, `pageAgentDom.ts`, `pageAgentDomTree.ts`, `pageAgentDomHighlight.ts`, `pageAgentInspect.ts`, `pageAgentFiberSearch.ts`, `pageAgentFiberElement.ts`, `pageAgentFiberDescribe.ts`, `pageAgentFiberRegistry.ts`, `pageAgentSerialization.ts`, `pageAgentSerializationCore.ts`, `pageAgentCollectionPath.ts`, `pageAgentSerializerSummary.ts`, `pageAgentSerializerOptions.ts`, `pageAgentHookState.ts`, `pageAgentHookMetadata.ts`, `pageAgentHooksInfo.ts`)에 구현 함수 추가
2. `pageAgentMethods.ts`의 method 라우터에 handler 연결
3. `controllerWiring.ts`에서 호출 및 타입 가드 연결(엔트리 파일 `controller.ts`는 bootstrap 실행만 담당)
4. 필요하면 `src/shared/inspector`(배럴) 기준으로 타입 확장

## 6.1 pageAgent DOM 모듈 분리 규칙

- DOM 모듈 위치: `src/content/dom/**`
- `pageAgentDomTree.ts`: DOM tree 직렬화(getDomTree) 전담
- `pageAgentDomHighlight.ts`: component highlight/hover preview 스타일 적용/복원, scrollIntoView, 상태 스냅샷 전담
- `pageAgentDomSelectors.ts`: DOM selector/path 계산(`buildCssSelector`, `getElementPath`, `resolveTargetElement`) 전담
- `pageAgentDom.ts`: DOM tree/highlight handler 결선과 DOM selector helper 재export 전담
- `pageAgentDomTree.ts`: unknown request payload를 안전 파싱(selector/pickPoint)하고 노드 budget 컨텍스트(`visitedNodes`, `truncatedByBudget`)로 직렬화 상태를 추적
- `pageAgentDomHighlightState.ts`: highlight/preview 스타일 snapshot 저장·복원·clear와 selector 기반 스타일 적용 상태 전이 전담
- `pageAgentDomHighlight.ts`: highlight/preview 응답 payload(tag/selector/domPath/rect) 조립 오케스트레이션 전담
- `pageAgent.ts`: 설치 가드와 runtime bootstrap 엔트리 전담
- `pageAgentRuntime.ts`: 요청 method 라우팅/핸들러 조립과 bridge 설치 전담

## 6.2 pageAgent Bridge 모듈 분리 규칙

- `pageAgentBridgeMessages.ts`: bridge request payload 검증(`readBridgeRequestMessage`)과 공통 response 전송(`postBridgeResponse`) 전담
- `pageAgentBridge.ts`: window message 리스너 설치와 bridge message pipeline(request 검증 -> method 실행 -> response 전송) 오케스트레이션, non-string method 문자열 정규화 전담
- `pageAgentRuntime.ts`: bridge 설치 엔트리와 runtime 옵션(bridge source/action) 주입 전담
- `runtime/pageAgentRuntimeConfig.ts`: runtime method executor 기본 옵션(storage key, budget)을 생성하는 설정 계층 전담
- `runtime/pageAgentRuntimeDomHandlers.ts`: DOM handler args 캐스팅(unknown -> typed payload) 어댑터 계층 전담
- `runtime/pageAgentRuntimeInspectHandlers.ts`: inspect 의존성(fiber/hook/serializer/function inspect registry) 결선 조립 전담
- `runtime/pageAgentRuntimeTypes.ts`: runtime method executor 옵션/함수 타입 정의 전담
- `pageAgentRuntimeBootstrap.ts`: dom handler + inspect handler를 method executor로 조합하는 bootstrap 오케스트레이션 전담

## 6.3 pageAgent Method Router 모듈 분리 규칙

- `pageAgentTargetFetch.ts`: `fetchTargetData` 입력 파싱(targetPath/method list/autoDiscover)과 대상 객체 탐색/메서드 실행/예외 결과 포맷 전담
- `pageAgentMethods.ts`: method 이름 -> 도메인 핸들러 라우팅과 target fetch helper 결선 전담
- `pageAgentRuntimeBootstrap.ts`: React inspect/domain 핸들러 구현체를 라우터에 주입하는 조립 전담
- `runtime/pageAgentRuntimeInspectHandlers.ts`: inspect 의존성 결선을 `pageAgentRuntimeBootstrap.ts` 밖으로 분리해 라우터 조립 책임을 축소

## 6.4 pageAgent Hook Group 모듈 분리 규칙

- hook inspect 모듈 위치: `src/content/hooks/inspect/**`
- `pageAgentHookStack.ts`: hook display name 정규화, stack frame 파싱, custom hook 후보 프레임 판별 유틸 전담
- `pageAgentHookGrouping.ts`: hook grouping helper public export 배럴 전담
- `pageAgentHookGroupingAncestor.ts`: root/hook stack 공통 조상 frame index 탐색과 휴리스틱 캐시(`mostLikelyAncestorFrameIndex`) 전담
- `pageAgentHookGroupingPath.ts`: custom hook path 수집, trimmed/all-frame path 추론 전담
- `pageAgentHookGroupingPrimitive.ts`: primitive frame index 탐색(wrapper frame 보정 포함), primitive 이름 정규화 전담
- `pageAgentHookRuntime.ts`: global hook dispatcher ref 탐색, render 함수/기본 props 해석 유틸 전담
- `pageAgentHookGroupRuntimeContext.ts`: hook group inspect 실행 전 runtime 컨텍스트(fiber/renderFn/dispatcher/componentName) 해석 전담
- `pageAgentHookResult.ts`: custom hook metadata 배열 결과(`groupNames/groupPaths/primitive*`) 길이 정렬(pad/truncate) 전담
- `pageAgentHookMetadataBuild.ts`: hookLog + stack 비교 결과를 custom hook metadata 배열(`groupNames/groupPaths/primitive*`)로 변환하는 루프 전담
- `pageAgentHookDispatcherTypes.ts`: hook inspect dispatcher 공용 타입(`HookInspectState`, `HookLogEntry`) 전담
- `pageAgentHookDispatcherState.ts`: hook cursor(`nextHook`/`readHookMemoizedState`)와 context snapshot/log push 상태 유틸 전담
- `pageAgentHookDispatcherMethodTypes.ts`: dispatcher built-in 메서드 생성 옵션 타입 정의 전담
- `pageAgentHookDispatcherMethodContextState.ts`: context/state/reducer/ref/transition/sync-store/id 메서드 구현 전담
- `pageAgentHookDispatcherMethodEffects.ts`: effect/layout/insertion/imperative/debug 메서드 구현 전담
- `pageAgentHookDispatcherMethodComputed.ts`: memo/callback/deferred/use/useOptimistic/useActionState 등 계산/동시성 메서드 구현 전담
- `pageAgentHookDispatcherMethods.ts`: context/effect/computed 메서드 팩토리를 병합한 built-in dispatcher 메서드 조립 전담
- `pageAgentHookDispatcher.ts`: state/method helper 조립과 Proxy 기반 generic hook fallback 결선 전담
- `pageAgentHookPrimitiveStack.ts`: dispatcher warmup 로그를 primitive별 stack frame 캐시로 구성하는 단계 전담
- `pageAgentHookInspectContext.ts`: hook inspect dispatcher/state(`currentHook`/`suspendedToken`/`hookLog`) 생성과 primitive warmup cache 조립 전담
- `pageAgentHookInspectRender.ts`: dispatcher 적용 render 실행 단계(runHookInspectRender args 계약 재사용 + resolveDefaultProps 결선) 전담
- `pageAgentHookRenderExecution.ts`: dispatcher 교체, console mute, hook inspect render 실행, suspended(use) 예외 완화, dispatcher/console 복구 전담
- `pageAgentHookGroups.ts`: stack/grouping/runtime/result/metadata-build/dispatcher/primitive-stack/render-execution 유틸을 조합해 custom metadata(group/path/primitive) 오케스트레이션 전담
- `pageAgentInspectSelection.ts`: reactInspect 결과 목록에서 selectedIndex 결정 규칙(선호 fiber, target match, dom selector fallback, non-host fallback) 전담
- `pageAgentInspectTypes.ts`: inspect 오케스트레이션 공용 타입(FiberLike/serializer/options) 정의 전담
- `pageAgentInspectFlowWiring.ts`: fiber-search helper + inspect path/components flow 결선을 한 곳에서 조립 전담
- `pageAgentInspectPathValue.ts`: inspectPath path 순회와 special collection segment 해석 전담
- `pageAgentInspectPathMode.ts`: inspectPath mode(`serializeValue`/`inspectFunction`) 분기별 응답 구성 전담
- `pageAgentInspectDomInfo.ts`: fiber -> host element 탐색 및 DOM selector/path/containsTarget 계산 전담
- `pageAgentInspectTarget.ts`: selector/pickPoint 기준 target element/nearest/root 해석과 inspectPath 대상 fiber fallback 탐색 전담
- `pageAgentInspectComponentsArgs.ts`: `reactInspect` 요청 입력(selector/pickPoint/selectedComponentId/lightweight)을 안전하게 파싱해 정규화 전담
- `pageAgentInspectComponentsSource.ts`: nearest source element를 selector/path/tag 요약 payload로 직렬화 전담
- `pageAgentInspectComponentWalk.ts`: root fiber DFS 순회와 component row payload 구성, target match 후보 인덱스 계산 전담
- `pageAgentInspect.ts`: inspect flow factory 결선(`components/path`)과 dependency 주입 전담

## 6.5 pageAgent Inspect 모듈 분리 규칙

- `pageAgentInspectSelection.ts`: inspect 결과 selectedIndex 계산 로직 전담
- `pageAgentInspectTypes.ts`: `pageAgentInspect.ts`/inspect flow가 공유하는 의존성 타입 정의 전담
- `pageAgentInspectFlowWiring.ts`: `createInspectReactPathFlow`/`createInspectReactComponentsFlow` 결선 조립 전담
- inspect path 모듈 위치: `src/content/inspect/path/**`
- `pageAgentInspectPathArgs.ts`: `reactInspectPath` 입력 payload 파싱(componentId/section/mode/path/serializeLimit) 전담
- `pageAgentInspectPathValue.ts`: `reactInspectPath` path 순회와 collection token 해석 전담
- `pageAgentInspectPathMode.ts`: `reactInspectPath` mode별 serialize/function inspect 응답 구성 전담
- `pageAgentInspectPathFlow.ts`: `reactInspectPath` 대상 fiber 해석 + path resolution + mode 응답 조립 오케스트레이션 전담
- inspect components 모듈 위치: `src/content/inspect/components/**`
- `pageAgentInspectComponentsArgs.ts`: `reactInspect` 입력 파싱/정규화 전담
- `pageAgentInspectComponentsSource.ts`: `reactInspect` 응답의 source element 요약(selector/path/tag) 조립 전담
- `pageAgentInspectComponentsRoot.ts`: `reactInspect` root 해석 + lightweight fallback root 재탐색(selected id 복원, selector/pickPoint 모두 비어있을 때만 허용) + walk cache(fiberIdMap/hostCache/visiting) 준비 전담
- `pageAgentInspectComponentsWalkContext.ts`: `walkInspectableComponents` 호출 결선(getDomInfo/getHooks/getStableId/serializer)과 typed 결과 정규화 전담
- `pageAgentInspectComponentsResult.ts`: walked components에서 selectedIndex/source summary 계산 전담
- `pageAgentInspectComponentsFlow.ts`: `reactInspect` root helper + walk helper + result helper를 조합해 응답 payload를 조립하는 오케스트레이션 전담
- `pageAgentInspectDomInfo.ts`: host element 탐색 캐시/순환 방지와 DOM 메타데이터(selector/path/tag/containsTarget) 계산 전담
- `pageAgentInspectTarget.ts`: target element/nearest/root resolution과 inspectPath targetFiber 조회 fallback 전담
- `pageAgentInspectComponentWalk.ts`: inspect 대상 root fiber 트리를 순회해 component 목록과 target 후보 인덱스 계산 전담
- `pageAgentInspect.ts`: `reactInspect`/`reactInspectPath` 오케스트레이션과 응답 조립 전담
- `pageAgentRuntime.ts`: bridge 설치 entry와 runtime option 주입 전담
- `runtime/pageAgentRuntimeInspectHandlers.ts`: inspect/helper 의존성 결선 전담
- `pageAgentRuntimeBootstrap.ts`: method executor 생성 오케스트레이션 전담

## 6.6 pageAgent Fiber Search 모듈 분리 규칙

- `pageAgentFiberSearch.ts`: componentId 기반 root/fiber 탐색 오케스트레이션 전담(`findRootFiberByComponentId`, `findFiberByComponentId*`)
- `pageAgentFiberSearchTypes.ts`: fiber search helper 타입(`FiberLike`, options) 정의 전담
- `pageAgentFiberSearchTree.ts`: root subtree DFS 기반 component id 존재 검사/target fiber 탐색 전담
- `pageAgentFiberSearchDomScan.ts`: document BFS 기반 root fiber 스캔(visited-root dedupe 포함) 전담
- 2026-02 리팩터링: fiber search 모듈(`types/tree/domScan/main`)에서 `@ts-nocheck`를 제거하고 `tag` type guard를 도입해 inspectable 판정 타입 안정성을 강화
- `pageAgentFiberElement.ts`: DOM element -> fiber 탐색(`getReactFiberFromElement`, `findNearestFiber`, `findAnyFiberInDocument`) 전담
- `pageAgentFiberDescribe.ts`: fiber root/name/tag/선택 대상 계산(`findRootFiber`, `getFiberName`, `isInspectableTag`, `findPreferredSelectedFiber`) 전담
- `pageAgentFiberRegistry.ts`: fiber stable id 할당(`getFiberIdMap`, `getStableFiberId`)과 function inspect registry(`registerFunctionForInspect`) 전담
- `pageAgentInspect.ts`: fiber search 유틸을 조합해 inspect 흐름의 대상 fiber 결정 전담

## 6.7 pageAgent Serialization 모듈 분리 규칙

- serialization 모듈 위치: `src/content/serialization/**`
- `pageAgentSerialization.ts`: serializer public export 배럴(`makeSerializer`, `serializePropsForFiber`, `resolveSpecialCollectionPathSegment`) 전담
- `pageAgentSerializationValue.ts`: inspect payload value serializer 오케스트레이션(`makeSerializer`), depth/call budget + circular 처리 + strategy dispatch 전담
- `pageAgentSerializationValuePrimitives.ts`: primitive/special object probe(`serializePrimitiveValue`, `serializeSpecialObjectValue`) 전담
- `pageAgentSerializationProps.ts`: fiber props 직렬화 오케스트레이션(`serializePropsForFiber`)과 non-object fallback 처리 전담
- `pageAgentSerializationPropsBudget.ts`: host/non-host fiber key budget(`maxKeys`, `perKeySerializeBudget`) 계산 전담
- `pageAgentSerializationPropsEntries.ts`: fiber props key 순회 직렬화(children summary + prop serializer 호출 + truncation 토큰) 전담
- `pageAgentSerializationCore.ts`: serializer core helper public export 배럴 전담
- `pageAgentSerializationCoreInternalKey.ts`: serializer 내부키 매핑 helper 전담
- `pageAgentSerializationCoreDehydrated.ts`: dehydrated 토큰 생성과 객체 class name 판별 helper 전담
- `pageAgentSerializationCoreSeenStore.ts`: 순환 참조 저장소(`WeakMap`/fallback list) 전담
- `pageAgentSerializationStrategies.ts`: array/map/set/object 전략 public export 배럴 전담
- `pageAgentSerializationStrategyTypes.ts`: serializer strategy context 타입 정의 전담
- `pageAgentSerializationCollectionStrategies.ts`: array/map/set 직렬화 전략(`__ecRefId`, `__truncated__`) 전담
- `pageAgentSerializationObjectStrategy.ts`: object key 순회 직렬화 전략(children/internal key/class meta 처리) 전담
- `pageAgentSerializerOptions.ts`: serializer 옵션(`maxDepth`, `maxObjectKeys` 등) 입력을 내부 한계값으로 정규화 전담
- `pageAgentSerializerSummary.ts`: React-like type name 해석과 `children` 요약 직렬화(`summarizeChildrenValue`) 전담
- `pageAgentCollectionPath.ts`: inspectPath 특수 collection path token(`__ec_map_entry__`, `__ec_map_value__`, `__ec_set_entry__`) 해석 전담
- `pageAgentRuntime.ts`/`pageAgentInspect.ts`: serializer/collection path 유틸을 호출해 hook/props 데이터 직렬화와 path 탐색 흐름만 조립

## 6.8 pageAgent Hook State 모듈 분리 규칙

- `pageAgentHookState.ts`: hook 이름 추론(`inferHookName`, queue/reducer/memoizedState 패턴)과 Ref hook 상태 표시 정규화(`normalizeHookStateForDisplay`) 전담
- `pageAgentRuntime.ts`: fiber hook 순회 중 hook state helper를 호출해 목록 오케스트레이션만 담당

## 6.9 pageAgent Hook Metadata 모듈 분리 규칙

- `pageAgentHookMetadata.ts`: custom hook metadata(`groupNames`, `groupPaths`, primitive metadata`)를 hooks 배열에 병합하고 fallback hook slot 보강/빈 groupPath 정규화 규칙 전담
- 2026-02 리팩터링: main-world pageAgent 경로의 잔여 `@ts-nocheck` 제거 완료(`pageAgentBridge.ts`, `pageAgentRuntime.ts`, `pageAgentInspectPathFlow.ts`, `pageAgentHookState.ts`, `pageAgentHookInspectContext.ts`, `pageAgentHookInspectRender.ts`, `pageAgentHookMetadata.ts`)
- `pageAgentRuntime.ts`: hook 순회 결과와 custom metadata를 결합하기 위한 호출 지점만 담당

## 6.10 pageAgent Hook Info 모듈 분리 규칙

- `pageAgentHooksInfo.ts`: fiber hook linked-list 순회(`getHooksRootValue`), includeCustomGroups 옵션 안전 파싱, custom group metadata 병합, hook 개수 집계(`getHooksCount`), panel 전달용 hook payload 직렬화(`getHooksInfo`) 전담
- `pageAgentRuntime.ts`: hook info helper 생성과 inspect 흐름 dependency 결선만 담당

## 6.11 Shared 배럴 export 규칙

- shared 모듈 위치: `src/shared/**`
- `src/shared/index.ts`: shared 하위 배럴 re-export 전담
- `src/shared/inspector/index.ts`: inspector 타입/가드 배럴 export 전담
- `src/shared/readers/index.ts`: reader 유틸 배럴 export 전담
- `src/content/**`, `src/features/**`, `tests/**`에서는 `src/shared/inspector/types`/`src/shared/inspector/guards`/`src/shared/readers/string` 대신 배럴 경로(`src/shared/inspector`, `src/shared/readers`)를 우선 사용

## 7. 워크스페이스(패널 스플릿) 모델

핵심 파일:

- `src/features/panel/workspacePanels.ts`
- `src/features/panel/controller.ts`
- `src/features/panel/controller/wiring/controllerWiring.ts`
- `src/features/panel/workspace/layout/layoutModel.ts`
- `src/features/panel/workspace/layout/layoutTypes.ts`
- `src/features/panel/workspace/layout/layoutTreeOps.ts`
- `src/features/panel/workspace/layout/layoutTreeCollect.ts`
- `src/features/panel/workspace/layout/layoutTreeTransform.ts`
- `src/features/panel/workspace/layout/layoutTreeNormalize.ts`
- `src/features/panel/workspace/layout/layoutVisibility.ts`
- `src/features/panel/workspace/layout/layoutReconcile.ts`
- `src/features/panel/workspace/manager.ts`
- `src/features/panel/workspace/managerLifecycle.ts`
- `src/features/panel/workspace/managerInteractionFlowWiring.ts`
- `src/features/panel/workspace/state/managerLayoutState.ts`
- `src/features/panel/workspace/managerInteractionHandlers.ts`
- `src/features/panel/workspace/interaction/dockDropApply.ts`
- `src/features/panel/workspace/interaction/dockPreview.ts`
- `src/features/panel/workspace/interaction/dragOverTarget.ts`
- `src/features/panel/workspace/interaction/dragDropFlow.ts`
- `src/features/panel/workspace/actionHandlers.ts`
- `src/features/panel/workspace/render/domReuse.ts`
- `src/features/panel/workspace/render/domPatcher.ts`
- `src/features/panel/workspace/render/renderPipeline.ts`
- `src/features/panel/workspace/render/renderFlow.ts`
- `src/features/panel/workspace/layout/layoutDom.ts`
- `src/features/panel/workspace/panelBindings.ts`
- `src/features/panel/workspace/containerBindings.ts`
- `src/features/panel/workspace/interactionBindings.ts`
- `src/features/panel/workspace/toggleBar.ts`
- `src/features/panel/workspace/render/panelSizing.ts`
- `src/features/panel/workspace/render/panelBodySizeObserver.ts`
- `src/features/panel/workspace/interaction/splitResize.ts`
- `src/features/panel/workspace/interaction/splitResizeSession.ts`
- `src/features/panel/workspace/interaction/resizeFlow.ts`
- `src/features/panel/workspace/scrollSnapshot.ts`
- `src/features/panel/workspace/state/statePersistence.ts`
- `src/features/panel/workspace/state/storage.ts`
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

- `layoutModel.ts`: workspace layout 모듈(`layoutTypes/layoutTreeOps/layoutVisibility`) public export 배럴 전담
- `layoutTypes.ts`: layout 타입(`panel/split/path/drop/state`)과 node path/ratio 정규화, node 생성, 기본 레이아웃, persisted layout parse 전담
- `layoutTreeOps.ts`: layout tree helper public export 배럴 전담
- `layoutTreeCollect.ts`: panel id 수집, panel append 변환 전담
- `layoutTreeTransform.ts`: remove/insert/swap, split ratio path 업데이트 전담
- `layoutTreeNormalize.ts`: visible prune, duplicate panel dedupe 전담
- `layoutVisibility.ts`: panel state map에서 visible panel id 목록 산출 전담
- `layoutReconcile.ts`: visible panel id/현재 layout을 기준으로 prune+dedupe+missing panel append 정합화 전담
- `manager.ts`: 워크스페이스 드래그/드롭, 리사이즈, 상태 영속화 오케스트레이션과 렌더 파이프라인 조립 전담
  - 2026-02 리팩터링: `manager.ts` 내부 thin wrapper를 제거하고 `dockPreview/panelSizing/scrollSnapshot/...` helper를 직접 결선해 호출 경로를 단순화
  - init/destroy 순서 제약과 interaction unbind 관리는 `managerLifecycle.ts`로 위임
  - drag/drop + resize + action flow 조립은 `managerInteractionFlowWiring.ts`로 위임
  - 상태 복원/패널 상태 변경/dock drop/split ratio persist 규칙은 `managerLayoutState.ts`로 위임
  - panel/container interaction handler 매핑은 `managerInteractionHandlers.ts`로 위임
  - DOM 렌더 단계의 empty fallback + patch 후처리(삽입/정리)는 `renderPipeline.ts`로 위임
  - panel 가시 상태 반영 + scroll/size/toggle 후처리 + panel open 토글은 `renderFlow.ts`로 위임
  - summary/toggle bar 액션 해석(toggle/close/visible 전환)은 `actionHandlers.ts`로 위임
- `managerLifecycle.ts`: workspace 상태 restore, interaction bind/unbind, observer start/stop, drag/resize 종료 정리 순서 전담
- `managerInteractionFlowWiring.ts`: dragDropFlow/resizeFlow/actionHandlers/interactionHandlers 결선과 manager용 lifecycle delegate(onDragEnd/stopResize) 제공 전담
- `managerLayoutState.ts`: workspace mutable 상태(root/panel map) 보관, restore/reconcile, panel state 전이, dock drop 적용, split ratio persist 규칙 전담
- `managerInteractionHandlers.ts`: drag-drop/resize/action handler를 panel/container interaction binding 입력 형태로 조합하는 결선 전담
- `dockDropApply.ts`: dock drop target(`center|left|right|top|bottom`)에 따른 layout tree 변경(교체/삽입/append) 순수 계산 전담
- `dockPreview.ts`: 도킹 drop 대상 패널 탐색, edge 기반 dock 방향 계산, preview 오버레이 위치/크기 렌더링 전담
- `dragOverTarget.ts`: dragover pointer 좌표 기준 drop target/preview rect 계산 전담
- `dragDropFlow.ts`: 드래그 시작/종료 상태, dragover/drop/leave 이벤트 전이와 drop 적용 호출 전담
- `actionHandlers.ts`: summary action 버튼(toggle/close), summary 기본 클릭 차단, toggle bar 클릭 상태 전환 핸들러 전담
- `domReuse.ts`: panel id 집합 비교와 재사용 가능한 workspace root 노드 탐색 규칙 전담
- `domPatcher.ts`: layout tree 재귀 patch, split node 재사용/대체 판단, first/second slot subtree 매핑 전담
- `renderPipeline.ts`: dock preview 위치 보정, layout patch/empty fallback 선택, root 삽입/불필요 child 정리 후처리 전담
- `renderFlow.ts`: panel state(hidden/dataset) 반영, layout render pipeline 호출, scroll/toggle/body-size 후처리와 panel open 토글 전담
- `layoutDom.ts`: split DOM 골격 생성과 panel split class reset 정리 전담
- `panelBindings.ts`: panel summary/action 버튼 drag/click/mousedown 이벤트 바인딩/해제 전담
- `containerBindings.ts`: workspace 컨테이너 drag/drop/pointer/dblclick, toggle bar click 이벤트 바인딩/해제 전담
- `interactionBindings.ts`: panel/container 이벤트 바인딩 묶음 조립과 통합 unbind cleanup 반환 전담
- `toggleBar.ts`: footer 토글바 active/aria 상태 렌더와 panel summary 토글 버튼(▾/▸) 문구 동기화 전담
- `panelSizing.ts`: 접힘 split row(`grid-template-rows`) 계산과 패널 body width/height 동기화 전담
- `panelBodySizeObserver.ts`: workspace panel/body `ResizeObserver` start/stop 생명주기와 observe 대상(panel content + panel elements) 결선 전담
- `splitResize.ts`: split divider pointerdown 상태 복원, pointer 좌표->ratio 계산, split ratio CSS 반영 전담
- `splitResizeSession.ts`: split resize drag 시작/종료 시 전역 pointer 리스너와 body cursor/userSelect 상태 제어 전담
- `resizeFlow.ts`: split resize pointer down/move/up/cancel 이벤트 전이와 split ratio persist 콜백 오케스트레이션 전담
- `scrollSnapshot.ts`: 레이아웃 patch 전후 스크롤 위치 캡처/복원 로직 전담
- `statePersistence.ts`: workspace panel 상태(`visible|closed`)와 layout tree의 localStorage 저장/복원 전담
- `storage.ts`: 워크스페이스 localStorage read/write 유틸
- `wheelScrollFallback.ts`: 패널 wheel capture 보정 리스너 설치/해제
- `controller.ts`: panel 실행 엔트리(`runPanel`)와 fatal error fallback 렌더만 담당
- `controllerWiring.ts`: panel 도메인 결선(pane/target/dom/react/runtime/bootstrap) 조립과 `bootstrapPanel` 핸들 생성 전담
- `controller/runtime.ts`: runtime refresh 스케줄러, element picker 브리지, runtime message listener, unload teardown 결선 전담
- `controller/bootstrap.ts`: workspace 초기화(createWorkspaceLayoutManager/initWheelScrollFallback)와 bootstrap flow 결선 전담

## 7.2 React Inspector 모듈 분리 규칙

- `reactInspector/signatureHash.ts`: props/hooks value를 제한 깊이/예산으로 해시하고 internal meta key를 제외하는 규칙 전담
- `reactInspector/signatureBuilders.ts`: detail/update/list 시그니처 문자열 조합 규칙 전담
- `reactInspector/signatures.ts`: signature public API 배럴 전담
- `reactInspector/search/searchTextCache.ts`: 검색 텍스트 토큰 수집(props/hooks/dehydrated/function/ref), 검색 캐시 생성/부분 갱신/길이 보정 전담
- `reactInspector/search/searchFilter.ts`: 검색어 terms 매칭, 가시 인덱스 + 조상 포함 계산, 조상 경로 확장, 접힘 상태 스냅샷/복원 전담
- `reactInspector/search/index.ts`: searchTextCache/searchFilter public export 결선 엔트리
- `reactInspector/resultModel.ts`: reactInspect 응답 컴포넌트 정규화(경량 모드 재사용), fingerprint 기반 변경 id 집합 계산 전담
- `reactInspector/applyFlow.ts`: apply 옵션 정규화, preserveCollapsed 기준 접힘 상태 복원/초기화, 상태 문구·후속 렌더 액션 결정 전담
- `reactInspector/flow/applyResultFlow.ts`: reactInspect data/selection/render 3단계 파이프라인 오케스트레이션과 controller 상태 반영 결선 전담
- `reactInspector/fetchOptions.ts`: `fetchReactInfo` 전달 옵션에서 applyOptions 조립, selectedComponentId 계산, runtime refresh/element selection 프리셋 팩토리 전담
- `reactInspector/flow/fetchRequestStage.ts`: `reactInspect` request stage(lookup 저장, loading pane 전환, script selected id 계산) 전담
- `reactInspector/flow/fetchResponseStage.ts`: `reactInspect` response stage(응답 파이프라인 전달 + 완료 콜백) 전담
- `reactInspector/flow/fetchFlow.ts`: request/response stage helper를 조합해 `reactInspect` 브리지 호출 오케스트레이션과 latest-request-only 응답 반영 규칙(stale 응답 discard, `onDone` 보장) 전담
- `reactInspector/flow/inspectDataStage.ts`: reactInspect data stage(이전 선택 id/접힘 스냅샷, 결과 모델 적용, 검색 캐시 재생성, 접힘 상태 복원) 순수 계산 전담
- `reactInspector/lookup.ts`: `lastReactLookup` 저장 갱신(keepLookup 규칙), runtime refresh 기본 lookup 계산, inspectPath selector/pickPoint fallback 계산 전담
- `reactInspector/openInSources.ts`: DevTools `inspect(fn)` 실행에 필요한 expression/실패 판정/상태 문구 생성 규칙(순수 함수) 전담
- `reactInspector/path/pathActions.ts`: `inspectFunctionAtPath`/`fetchSerializedValueAtPath` 액션 핸들러 생성, request runner 호출과 후속 action/value 처리 오케스트레이션 전담
- `reactInspector/path/pathBindings.ts`: controller 의존성(bridge caller, lookup getter, status setter)을 받아 request runner/function opener/action handler 체인을 한 번에 조립하는 결선 계층 전담
- `reactInspector/path/pathCompletion.ts`: `inspectFunction`/`serializeValue` completion 후처리(오류 상태 문구 또는 open payload 결정, 직렬화 값 추출) 규칙 전담
- `reactInspector/path/pathFailure.ts`: `reactInspectPath` 요청 실패(runtime/response) 유형 정규화와 함수 inspect 이동 실패 상태 문구 규칙 전담
- `reactInspector/path/pathOpenAction.ts`: DevTools `inspect(fn)` eval 실행 오케스트레이션과 failure/success 상태 반영 전담
- `reactInspector/path/pathRequest.ts`: `reactInspectPath` 요청 args(componentId/selector/pickPoint/section/path/mode/serializeLimit) 조립과 selector fallback 규칙 적용 전담
- `reactInspector/path/pathRequestCompletion.ts`: `reactInspectPath` 브리지 콜백 응답을 판별 유니온 completion(`success`/`failure`)으로 정규화하고 success/failure 타입가드를 제공해 controller onDone 분기를 단순화하는 규칙 전담
- `reactInspector/path/pathRequestRunner.ts`: `reactInspectPath` request runner 생성(lookup getter + bridge caller 주입), args 조립/브리지 호출/completion 변환 오케스트레이션 전담
  - bridge 호출 타입은 `bridge/pageAgentClient.ts`의 공용 타입(`CallInspectedPageAgent`)을 별칭 없이 그대로 재사용
- `reactInspector/path/pathResponse.ts`: `reactInspectPath` 성공 응답(`inspectFunction`, `serializeValue`) payload 파싱과 기본값 규칙 전담
- `reactInspector/list/listRenderFlow.ts`: Components Tree empty/filter/signature skip/강제 렌더/updated id 소거 흐름 오케스트레이션 전담
- `reactInspector/flow/resetStateFlow.ts`: react inspector 상태/캐시/detail fetch queue/pane reset 문구 적용 흐름 전담
- `reactInspector/collectionDisplayMeta.ts`: display path map/collection meta 부착, child path 역매핑, meta 읽기 규칙 전담
- `reactInspector/collectionDisplayTokenNormalize.ts`: map/set serializer token을 display-friendly 배열로 정규화하고 entry pair 파싱 규칙 전담
- `reactInspector/collectionDisplay.ts`: collection display public API 배럴(메타/토큰 정규화 결선) 전담
- `reactInspector/preview/jsonCollectionPreview.ts`: map/set token + display collection meta 배열 preview 문자열 공통 빌더와 depth/budget 제한 규칙 전담
- `reactInspector/preview/jsonPreviewCollection.ts`: summary/hook inline preview에서 공통 사용하는 collection preview limit preset 결선 전담
- `reactInspector/hookTreeTypes.ts`: hook row/tree 렌더 공용 타입(`HookRowItem`, `HookTreeNode`) 정의 전담
- `reactInspector/hookTreeNormalization.ts`: hook payload 정규화(index/name/group/groupPath/state)와 badge 추론 전담
- `reactInspector/hookTreeBuilders.ts`: explicit groupPath 트리 빌더와 fallback(custom group + builtin hook) 빌더 전담
- `reactInspector/hookTreeModel.ts`: 정규화 + 빌더를 조합해 hook tree 생성 오케스트레이션 전담
- `reactInspector/flow/noResultStateFlow.ts`: 검색 결과 없음 상태(detail/status/dom) 공통 문구/부수효과 적용 흐름 전담
- `reactInspector/jsonTokenNodes.ts`: function token inspect 링크 렌더와 circular ref 지연 확장(details toggle) 렌더 규칙 전담
- `reactInspector/jsonRenderTypes.ts`: JSON 렌더 공통 context/handler 타입(`JsonRenderContext`, `FetchSerializedValueAtPathHandler` 등) 소스 오브 트루스
- `reactInspector/preview/jsonObjectPreview.ts`: object/array preview 문자열 빌더(깊이 제한/entry 제한/meta key 필터) 공통 로직 전담
- `reactInspector/jsonObjectArraySummary.ts`: object/array details summary의 meta/preview 문자열 계산(map/set display meta, object visible key count) 전담
- `reactInspector/jsonObjectArrayChildren.ts`: object/array details의 child row 렌더(key path 전달, internal meta key 제외, expandable row 조합) 전담
- `reactInspector/preview/jsonPreviewPrimitive.ts`: JSON/hook preview의 primitive/dehydrated 문자열 포맷 규칙 전담
- `reactInspector/preview/jsonPreviewObjectMeta.ts`: object class meta key 판별/표시 이름 계산(`isJsonInternalMetaKey`, `getObjectDisplayName`) 전담
- `reactInspector/preview/jsonPreviewTokenStrategies.ts`: summary/hook inline preview의 function/circular/dehydrated token 분기 전담
- `reactInspector/preview/jsonPreviewBudget.ts`: preview budget 생성/소비/소진 판별 공통 유틸 전담
- `reactInspector/preview/jsonPreview.ts`: JSON/hook inline summary preview 오케스트레이션(primitive/token/object/array/collection 전략 결선) 전담
- `reactInspector/jsonDehydratedNode.ts`: dehydrated token summary/details 렌더와 toggle 시 runtime serialize refresh 치환 흐름 전담
- `reactInspector/jsonObjectArrayNode.ts`: object/array details summary 렌더, lazy children 렌더, runtime refresh-on-expand 흐름 전담
- `reactInspector/jsonValueNode.ts`: function/circular/dehydrated/primitive/object-array 분기 전략을 재귀 renderer 팩토리로 조합
- `reactInspector/jsonRowUi.ts`: details toggle 버튼, row toggle spacer, expandable key/value row UI 이벤트/레이아웃 전담
- `reactInspector/jsonRefMap.ts`: JSON 루트에서 `__ecRefId` 역참조 맵을 순환 안전하게 수집하고 내부 meta key 스캔 제외 규칙 전담
- `reactInspector/jsonHookTreeRenderer.ts`: hook row/group(details) DOM 재귀 렌더와 hook state path(`sourceIndex/state`) 전달 규칙 전담
- `reactInspector/search/searchStatus.ts`: 검색 결과 없음 상태 텍스트, 검색 매치 요약 상태 문구 생성 규칙 전담
- `reactInspector/controllerState.ts`: React Inspector mutable 상태(`reactComponents`, `collapsedComponentIds`, `componentSearchTexts`, render signature cache, lookup`)의 read/write snapshot과 apply/reset update 반영 규칙 전담
- `reactInspector/controllerStateModel.ts`: React Inspector mutable 모델 초기화와 list/detail/reset/apply writer를 순수 helper로 분리해 상태 전이 규칙 전담
- `reactInspector/controllerDerivations.ts`: controller flow 공용 파생 계산(build signature/index, search cache+filter, ancestor expand, JSON section renderer 조립) 전담
- `reactInspector/controllerFlowTypes.ts`: controller flow 결선 옵션/공용 pane setter 타입 정의 전담
- `reactInspector/controllerFlowInteractionWiring.ts`: list/detail render flow, selection/search binding, detail queue와 no-result 상태 결선 전담
- `reactInspector/controllerFlows.ts`: interaction wiring + fetch/reset/apply 파이프라인 조립 전담(DOM ref getter 기반 지연 접근 + derivation helper 조합)
- `controller/context.ts`: panel DOM ref, picker mode 상태, workspace/runtime listener 해제 핸들을 컨텍스트 객체로 수집해 controller 오케스트레이션과 상태 저장 책임 분리
- `controller/runtime.ts`: runtime refresh + element picker + runtime message listener + teardown 결선을 조합해 controller에서 런타임 이벤트 결선 책임 분리
- `controller/bootstrap.ts`: workspace initialization + bootstrap flow 결선을 조합해 controller에서 부트스트랩 wiring 책임 분리
- `reactInspector/search/searchInputFlow.ts`: 검색 입력 이벤트 시 no-result 처리, 조상 확장, 선택 보정, 상태 문구 갱신 오케스트레이션 전담
- `reactInspector/search/searchInputBindingFlow.ts`: 검색 input DOM 값 읽기, query 상태 갱신, searchInputFlow 결선 전담
- `reactInspector/viewState.ts`: React Inspector 기본/로딩/빈 목록 placeholder 상태와 list empty 문구 생성 규칙 전담
- `reactInspector/selection/index.ts`: 선택 옵션 정규화, 선택 index 적용 후 렌더/스크롤/상세 지연조회/DOM 하이라이트 시퀀스 전담
- `reactInspector/selection/selectionBindingFlow.ts`: selection handler 생성 시 scrollIntoView(requestAnimationFrame) 결선과 selector 의존성 주입 전담
- `reactInspector/selection/selectionModel.ts`: preserveSelection/selectedIndex/filterResult를 조합해 최종 선택 인덱스와 선택 변경 여부 계산 전담
- `reactInspector/list/listTreeModel.ts`: visible component 목록을 parent-child 트리 맵(`Map<parentId, childrenIndices>`)으로 구성하는 규칙 전담
- `reactInspector/list/listTreeScrollAnchor.ts`: 목록 리렌더 전후 selected item 기준 scroll 앵커 캡처/복원 규칙 전담
- `reactInspector/list/listTreeNodeRenderer.ts`: Components Tree row 렌더(토글/hover/focus/select 이벤트 포함)와 재귀 child 렌더 전담
- `reactInspector/list/listTreeRenderer.ts`: tree model/scroll anchor/listTreeNodeRenderer helper를 조합해 Components Tree DOM 렌더 오케스트레이션 전담
- `reactInspector/detail/detailRenderer.ts`: 선택 컴포넌트 상세 패널 DOM 렌더와 render signature 캐시 판정 전담
- `reactInspector/detail/detailRenderFlow.ts`: detail render cache 읽기/쓰기와 detailRenderer 호출 결선 전담
- `reactInspector/detail/detailApply.ts`: 선택 컴포넌트 상세 응답 병합, 검색 캐시 패치, 선택 상세 재렌더 조건 처리 전담
- `reactInspector/detail/detailQueueFlow.ts`: 상세 응답 병합(detailApply)과 detailFetchQueue 의존성 결선(lookup/selected/find/apply) 조립 전담
- `reactInspector/jsonSection.ts`: props/hooks JSON 트리 오케스트레이션과 refMap/hook tree renderer 결선 전담
- `reactInspector/detail/detailFetchQueueState.ts`: detail fetch queue mutable 상태(inFlight/queued/failure map)와 cooldown 판정/성공-실패 기록/finish-reset 전이 규칙 전담
- `reactInspector/detail/detailFetchQueueMessages.ts`: 상세 fetch 실패 문구 템플릿과 stale selection 기본 문구 전담
- `reactInspector/detail/detailFetchQueueResponse.ts`: reactInspect 상세 응답(payload/error/형식 오류/missing detail)을 detail queue용 결과로 정규화 전담
- `reactInspector/detail/detailFetchQueue.ts`: 선택 컴포넌트 상세 데이터 지연 조회 큐 오케스트레이션과 queue state/response/messages helper 결선 전담
- `controllerWiring.ts`: panel 이벤트/도메인 결선을 조립하고, DOM/lifecycle mutable 상태는 `controller/context.ts`, 런타임 이벤트 결선은 `controller/runtime.ts`, 부트스트랩 결선은 `controller/bootstrap.ts`, React Inspector 상태는 `reactInspector/controllerState.ts`/`reactInspector/controllerStateModel.ts`, 결선 파이프라인은 `reactInspector/controllerFlows.ts`로 위임
- `controllerWiringDataFlows.ts`: `targetFetch/flow.ts`, `domTree/fetchFlow.ts`, `pageAgent/selectionSync.ts`를 결선해 `populateTargetSelect`/`onFetch`/`fetchDomTree`/selection sync 핸들을 조립
- `controllerWiringReactInspector.ts`: `reactInspector/path/pathBindings.ts`와 `reactInspector/controllerFlows.ts`를 연결해 `fetchReactInfo`/`onComponentSearchInput` 핸들을 조립
- `controllerWiringLifecycle.ts`: `controller/runtime.ts`와 `controller/bootstrap.ts`를 결선하고 runtime fetch 옵션 프리셋/네비게이션 리스너/초기 refresh 호출을 조립
- `controller.ts`: `controllerWiring.ts`가 반환한 `bootstrapPanel` 실행과 fatal error fallback만 담당
- `domRefs.ts`: PanelView 마운트와 필수 DOM ref 수집/검증 전담

## 7.3 DOM Tree 모듈 분리 규칙

- `domTree/renderer.ts`: DOM 노드 라벨 생성(`<tag>`, `</tag>`)과 트리 `<details>` 렌더링 전담
- `domTree/fetchFlow.ts`: getDomTree 조회 시작 상태, pageAgent 응답 파이프라인 연결, latest-request-only 응답 반영(stale discard), 결과 렌더/실패 문구 반영 규칙 전담(`getDomTreeOutputEl` getter 기반 지연 DOM 접근)
- `controllerWiring.ts`: DOM Tree UI setter와 fetch flow 결선, 상위 이벤트(요소 선택/런타임 갱신) 오케스트레이션 전담

## 7.4 Panel Bridge 모듈 분리 규칙

- `bridge/pageAgentClient.ts`: panel -> background 메시지 전송, 공통 에러 처리, 응답 표준화, 공용 호출 타입(`CallInspectedPageAgent`) 제공 전담
- `controllerWiring.ts`: 비즈니스 흐름에 맞는 method/args 구성과 후속 UI 상태 업데이트 결선 전담

## 7.5 Runtime Refresh 모듈 분리 규칙

- `runtimeRefresh/scheduler.ts`: runtime 변경 이벤트 debounce, 최소 간격 보장, in-flight 중복 호출 큐 병합 전담
- `runtimeRefresh/panelRuntimeRefreshFlow.ts`: stored lookup 정규화, scheduler 결선, 페이지 네비게이션(reset + foreground refresh) 핸들러 조립 전담
- `controllerWiring.ts`: runtime refresh flow에 `fetchReactInfo`/UI setter를 주입하고 schedule/refresh/dispose 호출 결선을 조립

## 7.6 Panel PageAgent Response 모듈 분리 규칙

- `pageAgent/responsePipeline.ts`: `getDomTree`/`reactInspect` 응답 오류 처리, 타입 가드 검증, 실패 문구 규칙 전담
- `controllerWiring.ts`: 조회 트리거와 선택/경량 옵션 조립, 성공 시 도메인 상태 적용 함수 연결 결선 전담

## 7.7 Panel Selection Sync 모듈 분리 규칙

- `pageAgent/selectionSync.ts`: 선택 컴포넌트 DOM 하이라이트, hover preview 정리, Selected Element/DOM Tree 동기화 전담
- `controllerWiring.ts`: selection index/스크롤/상세 조회 흐름을 관리하고 selection sync 핸들러 호출 결선 전담

## 7.8 Panel Pane State 모듈 분리 규칙

- `paneState.ts`: 패널 텍스트 반영, `.empty`/`.error` 클래스 토글, empty placeholder signature 생성/반환 전담
- `paneSetters.ts`: output/react/dom pane setter 조립(`setOutput`, `setReactStatus`, `setDomTreeStatus` 등)과 React list/detail empty signature 반영 결선 전담
- `controllerWiring.ts`: 도메인 상태에 따라 어떤 메시지를 노출할지 결정하고 paneSetters/paneState 유틸 결선 전담

## 7.9 Panel Element Picker Bridge 모듈 분리 규칙

- `elementPicker/bridgeFlow.ts`: 요소 선택 시작 요청(`startElementPicker`)과 runtime 메시지 분기(`elementPickerStopped`/`pageRuntimeChanged`/`elementSelected`) 규칙, Selected Element 출력 텍스트 조립 전담
- `controller/runtime.ts`: picker 상태 setter, DOM/React fetch 액션, runtime refresh scheduler를 주입하고 runtime listener 결선까지 조립
- `controllerWiring.ts`: `controller/runtime.ts`를 bootstrap flow와 결합하는 결선 오케스트레이션 전담

## 7.10 Panel Target Fetch 모듈 분리 규칙

- `targetFetch/flow.ts`: target 목록 옵션 렌더링, `fetchTargetData` 요청 실행, 응답 직렬화/오류 문구 반영 규칙 전담
- `controllerWiring.ts`: target/fetch 버튼 DOM ref getter와 bridge caller를 주입하고 이벤트 바인딩 결선 전담

## 7.11 Panel Lifecycle Bootstrap 모듈 분리 규칙

- `lifecycle/bootstrapFlow.ts`: 패널 부트스트랩 순서(React 마운트, DOM ref 초기화, 초기 상태 문구, 이벤트 바인딩)와 unload cleanup 훅 바인딩 전담
- `lifecycle/panelWorkspaceInitialization.ts`: workspace manager/wheel fallback 초기화 콜백 결선 전담
- `lifecycle/runtimeMessageBinding.ts`: runtime message listener 결선/해제 함수 전담
- `lifecycle/fatalErrorView.ts`: 패널 bootstrap 실패 시 body 에러 뷰 렌더(기존 DOM 초기화 + 메시지 표시) 전담
- `lifecycle/panelTeardownFlow.ts`: unload 시 workspace manager/wheel fallback/runtime message listener/runtime scheduler/nav listener teardown 순서 전담
- `controller/runtime.ts`: runtime message binding/teardown flow/runtimerefresh+picker 결선을 구성하고, controller에 onSelect/onUnload 핸들을 제공
- `controller/bootstrap.ts`: workspace initialization + bootstrap flow를 결선하고 controller에 `bootstrapPanel` 핸들을 제공
- `controllerWiring.ts`: bootstrap/runtime/teardown flow에 의존성을 주입하고 상위 결선을 조립
- `controller.ts`: `bootstrapPanel` 실행과 fatal error fallback 렌더만 담당

## 8. 주요 UI 구성 파일 역할

- `src/ui/sections/shell/PanelViewSection.tsx`
  - UI 조립 전용 최상위 섹션 컴포넌트
  - `PanelHeaderSection`, `PanelWorkspaceSection`을 조합해 패널 골격을 구성

- `src/ui/components/**`
  - 재사용 가능한 작은 단위 컴포넌트
  - `components/actions/**`: 버튼/아이콘 액션 primitive 전담
  - `components/text/**`: 상태/서브타이틀 텍스트 primitive 전담

- `src/ui/panels/**`
  - 단독으로 렌더 가능한 완성 패널 컴포넌트
  - `panels/react/**`: React 트리/인스펙터 패널
  - `panels/element/**`: 선택 요소/경로/DOM 패널
  - `panels/common/**`: 공통 패널(raw result)
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
  - 패널 실행 엔트리(`runPanel`)와 fatal error fallback 처리
  - `controllerWiring.ts`에서 조립된 `bootstrapPanel`을 실행

- `src/features/panel/controller/wiring/controllerWiring.ts`
  - 브리지/조회/선택/렌더 상위 결선의 핵심
  - workspace 렌더/이벤트 상태머신은 `workspace/manager.ts`에 위임하고, wheel 보정은 `workspace/wheelScrollFallback.ts`를 사용
- `src/features/panel/controller/wiring/controllerWiringDataFlows.ts`
  - target/dom/selection 동기화 결선 조립 전담
- `src/features/panel/controller/wiring/controllerWiringReactInspector.ts`
  - React Inspector path binding + flow 결선 조립 전담
- `src/features/panel/controller/wiring/controllerWiringLifecycle.ts`
  - runtime refresh + bootstrap 결선 조립 전담

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
- `runtimeRefresh/scheduler.ts` 생성 옵션(`minIntervalMs`, `debounceMs`) 값 점검
- `elementPickerBridge.ts`의 notify throttle 값과 함께 조정

5. DOM 트리 렌더가 무거운 경우
- `pageAgentDom.ts`의 직렬화 제한(`MAX_DEPTH`, `MAX_CHILDREN_PER_NODE`) 점검

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
2. 필요 시 `src/features/panel/workspace/layout/layoutModel.ts`의 `createDefaultWorkspaceLayout()` 기본 트리 반영
3. `src/features/panel/workspace/manager.ts`의 이벤트/렌더 파이프라인에서 신규 패널 동작 경로 확인
4. `src/ui/panels/`에 새 패널 컴포넌트 파일 추가
5. `src/ui/panels/index.ts` export 등록
6. `src/ui/sections/workspace/WorkspacePanelsSection.tsx` 조립 목록에 추가
7. `controllerWiring.ts`(필요 시 `controller/context.ts`)에서 필요한 DOM ref/getter 결선 추가
8. `panel.html`에서 필요 스타일 추가

### 새 pageAgent 메서드 추가

1. 도메인 성격에 맞는 모듈(`pageAgentRuntime.ts`, `pageAgentDom.ts`, `pageAgentDomTree.ts`, `pageAgentDomHighlight.ts`, `pageAgentInspect.ts`, `pageAgentFiberSearch.ts`, `pageAgentFiberElement.ts`, `pageAgentFiberDescribe.ts`, `pageAgentFiberRegistry.ts`, `pageAgentSerialization.ts`, `pageAgentSerializationCore.ts`, `pageAgentCollectionPath.ts`, `pageAgentSerializerSummary.ts`, `pageAgentSerializerOptions.ts`, `pageAgentHookState.ts`, `pageAgentHookMetadata.ts`, `pageAgentHooksInfo.ts`)에 함수 작성
2. `pageAgentMethods.ts` 라우터 case에 메서드/핸들러 연결
3. `controllerWiring.ts`에서 `callInspectedPageAgent` 호출 경로 추가
4. `types.ts`/`guards.ts`에 응답 타입과 검증기 추가
5. 실패/성공 UI 문구(`setReactStatus`, `setDomTreeStatus`) 정리

---

관련 파일 바로가기:

- `src/features/panel/controller.ts`
- `src/features/panel/controller/wiring/controllerWiring.ts`
- `src/features/panel/controller/context.ts`
- `src/features/panel/controller/runtime.ts`
- `src/features/panel/controller/bootstrap.ts`
- `src/features/panel/domRefs.ts`
- `src/features/panel/bridge/pageAgentClient.ts`
- `src/features/panel/domTree/fetchFlow.ts`
- `src/features/panel/domTree/renderer.ts`
- `src/features/panel/elementPicker/bridgeFlow.ts`
- `src/features/panel/lifecycle/bootstrapFlow.ts`
- `src/features/panel/lifecycle/panelWorkspaceInitialization.ts`
- `src/features/panel/lifecycle/runtimeMessageBinding.ts`
- `src/features/panel/lifecycle/panelTeardownFlow.ts`
- `src/features/panel/targetFetch/flow.ts`
- `src/features/panel/pageAgent/responsePipeline.ts`
- `src/features/panel/pageAgent/selectionSync.ts`
- `src/features/panel/paneState.ts`
- `src/features/panel/paneSetters.ts`
- `src/features/panel/reactInspector/signatures.ts`
- `src/features/panel/reactInspector/signatureHash.ts`
- `src/features/panel/reactInspector/signatureBuilders.ts`
- `src/features/panel/reactInspector/search/index.ts`
- `src/features/panel/reactInspector/search/searchTextCache.ts`
- `src/features/panel/reactInspector/search/searchFilter.ts`
- `src/features/panel/reactInspector/resultModel.ts`
- `src/features/panel/reactInspector/applyFlow.ts`
- `src/features/panel/reactInspector/fetchOptions.ts`
- `src/features/panel/reactInspector/flow/fetchFlow.ts`
- `src/features/panel/reactInspector/flow/fetchRequestStage.ts`
- `src/features/panel/reactInspector/flow/fetchResponseStage.ts`
- `src/features/panel/reactInspector/flow/inspectDataStage.ts`
- `src/features/panel/reactInspector/lookup.ts`
- `src/features/panel/reactInspector/openInSources.ts`
- `src/features/panel/reactInspector/path/pathActions.ts`
- `src/features/panel/reactInspector/path/pathBindings.ts`
- `src/features/panel/reactInspector/path/pathCompletion.ts`
- `src/features/panel/reactInspector/path/pathFailure.ts`
- `src/features/panel/reactInspector/path/pathOpenAction.ts`
- `src/features/panel/reactInspector/path/pathRequest.ts`
- `src/features/panel/reactInspector/path/pathRequestCompletion.ts`
- `src/features/panel/reactInspector/path/pathRequestRunner.ts`
- `src/features/panel/reactInspector/path/pathResponse.ts`
- `src/features/panel/reactInspector/collectionDisplayMeta.ts`
- `src/features/panel/reactInspector/collectionDisplayTokenNormalize.ts`
- `src/features/panel/reactInspector/collectionDisplay.ts`
- `src/features/panel/reactInspector/preview/jsonPreviewCollection.ts`
- `src/features/panel/reactInspector/hookTreeTypes.ts`
- `src/features/panel/reactInspector/hookTreeNormalization.ts`
- `src/features/panel/reactInspector/hookTreeBuilders.ts`
- `src/features/panel/reactInspector/hookTreeModel.ts`
- `src/features/panel/reactInspector/jsonTokenNodes.ts`
- `src/features/panel/reactInspector/preview/jsonCollectionPreview.ts`
- `src/features/panel/reactInspector/preview/jsonObjectPreview.ts`
- `src/features/panel/reactInspector/jsonObjectArraySummary.ts`
- `src/features/panel/reactInspector/jsonObjectArrayChildren.ts`
- `src/features/panel/reactInspector/preview/jsonPreviewPrimitive.ts`
- `src/features/panel/reactInspector/preview/jsonPreviewObjectMeta.ts`
- `src/features/panel/reactInspector/preview/jsonPreviewTokenStrategies.ts`
- `src/features/panel/reactInspector/preview/jsonPreviewBudget.ts`
- `src/features/panel/reactInspector/preview/jsonPreview.ts`
- `src/features/panel/reactInspector/jsonDehydratedNode.ts`
- `src/features/panel/reactInspector/jsonObjectArrayNode.ts`
- `src/features/panel/reactInspector/jsonRowUi.ts`
- `src/features/panel/reactInspector/jsonRefMap.ts`
- `src/features/panel/reactInspector/jsonHookTreeRenderer.ts`
- `src/features/panel/reactInspector/search/searchStatus.ts`
- `src/features/panel/reactInspector/controllerState.ts`
- `src/features/panel/reactInspector/controllerStateModel.ts`
- `src/features/panel/reactInspector/controllerDerivations.ts`
- `src/features/panel/reactInspector/controllerFlowTypes.ts`
- `src/features/panel/reactInspector/controllerFlowInteractionWiring.ts`
- `src/features/panel/reactInspector/controllerFlows.ts`
- `src/features/panel/reactInspector/search/searchInputFlow.ts`
- `src/features/panel/reactInspector/viewState.ts`
- `src/features/panel/reactInspector/selection/index.ts`
- `src/features/panel/reactInspector/selection/selectionModel.ts`
- `src/features/panel/reactInspector/list/listTreeModel.ts`
- `src/features/panel/reactInspector/list/listTreeScrollAnchor.ts`
- `src/features/panel/reactInspector/list/listTreeNodeRenderer.ts`
- `src/features/panel/reactInspector/list/listTreeRenderer.ts`
- `src/features/panel/reactInspector/detail/detailRenderer.ts`
- `src/features/panel/reactInspector/detail/detailApply.ts`
- `src/features/panel/reactInspector/detail/detailFetchQueueState.ts`
- `src/features/panel/reactInspector/jsonSection.ts`
- `src/features/panel/reactInspector/detail/detailFetchQueueMessages.ts`
- `src/features/panel/reactInspector/detail/detailFetchQueueResponse.ts`
- `src/features/panel/reactInspector/detail/detailFetchQueue.ts`
- `src/features/panel/runtimeRefresh/scheduler.ts`
- `src/features/panel/workspace/layout/layoutModel.ts`
- `src/features/panel/workspace/layout/layoutTypes.ts`
- `src/features/panel/workspace/layout/layoutTreeOps.ts`
- `src/features/panel/workspace/layout/layoutTreeCollect.ts`
- `src/features/panel/workspace/layout/layoutTreeTransform.ts`
- `src/features/panel/workspace/layout/layoutTreeNormalize.ts`
- `src/features/panel/workspace/layout/layoutVisibility.ts`
- `src/features/panel/workspace/layout/layoutReconcile.ts`
- `src/features/panel/workspace/manager.ts`
- `src/features/panel/workspace/managerLifecycle.ts`
- `src/features/panel/workspace/managerInteractionFlowWiring.ts`
- `src/features/panel/workspace/state/managerLayoutState.ts`
- `src/features/panel/workspace/managerInteractionHandlers.ts`
- `src/features/panel/workspace/interaction/dockDropApply.ts`
- `src/features/panel/workspace/interaction/dockPreview.ts`
- `src/features/panel/workspace/interaction/dragOverTarget.ts`
- `src/features/panel/workspace/interaction/dragDropFlow.ts`
- `src/features/panel/workspace/actionHandlers.ts`
- `src/features/panel/workspace/render/domReuse.ts`
- `src/features/panel/workspace/render/domPatcher.ts`
- `src/features/panel/workspace/render/renderPipeline.ts`
- `src/features/panel/workspace/render/renderFlow.ts`
- `src/features/panel/workspace/layout/layoutDom.ts`
- `src/features/panel/workspace/panelBindings.ts`
- `src/features/panel/workspace/containerBindings.ts`
- `src/features/panel/workspace/interactionBindings.ts`
- `src/features/panel/workspace/toggleBar.ts`
- `src/features/panel/workspace/render/panelSizing.ts`
- `src/features/panel/workspace/render/panelBodySizeObserver.ts`
- `src/features/panel/workspace/interaction/splitResize.ts`
- `src/features/panel/workspace/interaction/splitResizeSession.ts`
- `src/features/panel/workspace/interaction/resizeFlow.ts`
- `src/features/panel/workspace/scrollSnapshot.ts`
- `src/features/panel/workspace/state/statePersistence.ts`
- `src/features/panel/workspace/state/storage.ts`
- `src/features/panel/workspace/wheelScrollFallback.ts`
- `src/ui/sections/shell/PanelViewSection.tsx`
- `src/ui/sections/workspace/WorkspacePanelsSection.tsx`
- `src/ui/panels/WorkspacePanelShell.tsx`
- `src/ui/panels/index.ts`
- `src/features/panel/workspacePanels.ts`
- `src/content/elementPicker.ts`
- `src/content/elementPickerOverlay.ts`
- `src/content/elementPickerBridge.ts`
- `src/content/elementPickerPageAgentClient.ts`
- `src/content/elementSelectorInfo.ts`
- `src/content/runtimeMessaging.ts`
- `src/content/pageAgent.ts`
- `src/content/pageAgentRuntime.ts`
- `src/content/pageAgentRuntimeBootstrap.ts`
- `src/content/runtime/pageAgentRuntimeConfig.ts`
- `src/content/runtime/pageAgentRuntimeDomHandlers.ts`
- `src/content/runtime/pageAgentRuntimeInspectHandlers.ts`
- `src/content/runtime/pageAgentRuntimeTypes.ts`
- `src/content/dom/pageAgentDom.ts`
- `src/content/dom/pageAgentDomSelectors.ts`
- `src/content/dom/pageAgentDomTree.ts`
- `src/content/dom/pageAgentDomHighlightState.ts`
- `src/content/dom/pageAgentDomHighlight.ts`
- `src/content/pageAgentBridge.ts`
- `src/content/pageAgentBridgeMessages.ts`
- `src/content/pageAgentMethods.ts`
- `src/content/pageAgentTargetFetch.ts`
- `src/content/pageAgentHookGroups.ts`
- `src/content/pageAgentHookGroupRuntimeContext.ts`
- `src/content/pageAgentHookStack.ts`
- `src/content/pageAgentHookGrouping.ts`
- `src/content/pageAgentHookRuntime.ts`
- `src/content/pageAgentHookResult.ts`
- `src/content/pageAgentHookMetadataBuild.ts`
- `src/content/hooks/inspect/pageAgentHookDispatcher.ts`
- `src/content/hooks/inspect/pageAgentHookDispatcherTypes.ts`
- `src/content/hooks/inspect/pageAgentHookDispatcherState.ts`
- `src/content/hooks/inspect/pageAgentHookDispatcherMethods.ts`
- `src/content/hooks/inspect/pageAgentHookPrimitiveStack.ts`
- `src/content/hooks/inspect/pageAgentHookInspectContext.ts`
- `src/content/hooks/inspect/pageAgentHookInspectRender.ts`
- `src/content/hooks/inspect/pageAgentHookRenderExecution.ts`
- `src/content/pageAgentHookState.ts`
- `src/content/pageAgentHookMetadata.ts`
- `src/content/pageAgentHooksInfo.ts`
- `src/content/pageAgentInspect.ts`
- `src/content/pageAgentInspectTypes.ts`
- `src/content/pageAgentInspectFlowWiring.ts`
- `src/content/pageAgentInspectSelection.ts`
- `src/content/inspect/path/pageAgentInspectPathArgs.ts`
- `src/content/inspect/path/pageAgentInspectPathValue.ts`
- `src/content/inspect/path/pageAgentInspectPathMode.ts`
- `src/content/inspect/path/pageAgentInspectPathFlow.ts`
- `src/content/inspect/components/pageAgentInspectComponentsArgs.ts`
- `src/content/inspect/components/pageAgentInspectComponentsSource.ts`
- `src/content/inspect/components/pageAgentInspectComponentsRoot.ts`
- `src/content/inspect/components/pageAgentInspectComponentsWalkContext.ts`
- `src/content/inspect/components/pageAgentInspectComponentsResult.ts`
- `src/content/inspect/components/pageAgentInspectComponentsFlow.ts`
- `src/content/pageAgentInspectDomInfo.ts`
- `src/content/pageAgentInspectTarget.ts`
- `src/content/pageAgentInspectComponentWalk.ts`
- `src/content/pageAgentFiberSearch.ts`
- `src/content/pageAgentFiberElement.ts`
- `src/content/pageAgentFiberDescribe.ts`
- `src/content/pageAgentFiberRegistry.ts`
- `src/content/serialization/pageAgentSerialization.ts`
- `src/content/serialization/pageAgentSerializationValue.ts`
- `src/content/serialization/pageAgentSerializationValuePrimitives.ts`
- `src/content/serialization/pageAgentSerializationProps.ts`
- `src/content/serialization/pageAgentSerializationPropsBudget.ts`
- `src/content/serialization/pageAgentSerializationPropsEntries.ts`
- `src/content/serialization/pageAgentSerializationCore.ts`
- `src/content/serialization/pageAgentSerializationCoreInternalKey.ts`
- `src/content/serialization/pageAgentSerializationCoreDehydrated.ts`
- `src/content/serialization/pageAgentSerializationCoreSeenStore.ts`
- `src/content/serialization/pageAgentSerializationStrategies.ts`
- `src/content/serialization/pageAgentSerializationStrategyTypes.ts`
- `src/content/serialization/pageAgentSerializationCollectionStrategies.ts`
- `src/content/serialization/pageAgentSerializationObjectStrategy.ts`
- `src/content/serialization/pageAgentCollectionPath.ts`
- `src/content/serialization/pageAgentSerializerSummary.ts`
- `src/content/serialization/pageAgentSerializerOptions.ts`
- `src/content/reactRuntimeHook.ts`
- `src/content/reactRuntimeHookLifecycle.ts`
- `src/background.ts`
- `src/background/router/messageRouter.ts`
- `src/background/router/contentScriptBridge.ts`
- `src/background/errors/messageErrors.ts`
- `src/background/relay/runtimeRelay.ts`
- `src/background/router/runtimeMessageTypes.ts`
- `panel.html`

## 12. 단위 테스트(Phase 58+)

- 테스트 러너: `vitest` (`npm test`)
- 설정 파일: `vitest.config.ts` (`jsdom` 환경, `tests/**/*.test.ts`)
- 최신 전체 검증 스냅샷 (2026-02-26)
  - `npm test`: `73 files`, `192 tests` 통과
  - `npx tsc --noEmit`: 통과
  - `npm run build`: 통과 (`dist/*.global.js` 재생성 성공)
- 현재 커버하는 리팩터링 축
  - `tests/reactInspector/applyResultFlow.test.ts`: `applyResultFlow.ts`의 empty/reset, no-result, list-only refresh, selection 옵션 적용 분기
  - `tests/reactInspector/listRenderFlow.test.ts`: `listRenderFlow.ts`의 empty/filter empty/signature skip/updated 강제 렌더 분기
  - `tests/reactInspector/listTreeModel.test.ts`: `listTreeModel.ts`의 parent-child 매핑(루트/고아/비가시 부모 fallback) 분기
  - `tests/reactInspector/listTreeScrollAnchor.test.ts`: `listTreeScrollAnchor.ts`의 selected item offset 기반 scroll 보정과 fallback 복원 분기
  - `tests/reactInspector/detailFetchQueueState.test.ts`: `detailFetchQueueState.ts`의 in-flight queue 전이, cooldown 판정, success/failure timestamp 갱신, reset 분기
  - `tests/reactInspector/detailFetchQueueResponse.test.ts`: `detailFetchQueueResponse.ts`의 runtime error/형식 오류/missing detail/success payload 정규화 분기
  - `tests/reactInspector/detailRenderFlow.test.ts`: `detailRenderFlow.ts`의 detail cache read/write와 renderer 호출 결선 분기
  - `tests/reactInspector/detailQueueFlow.test.ts`: `detailQueueFlow.ts`의 detail 병합 상태 반영과 detailFetchQueue 결선(getSelected/findById/apply) 분기
  - `tests/reactInspector/selectionBindingFlow.test.ts`: `selectionBindingFlow.ts`의 requestAnimationFrame 기반 선택 항목 scrollIntoView 결선 분기
  - `tests/reactInspector/searchInputBindingFlow.test.ts`: `searchInputBindingFlow.ts`의 query 갱신과 no-result/searchInputFlow 결선 분기
  - `tests/reactInspector/controllerState.test.ts`: `controllerState.ts`의 list/detail state writer와 reset/apply update 반영 분기
  - `tests/reactInspector/controllerStateModel.test.ts`: `controllerStateModel.ts`의 mutable 기본값, list/detail/reset/apply writer의 상태 전이/optional patch 보존 분기
  - `tests/reactInspector/controllerDerivations.test.ts`: `controllerDerivations.ts`의 search cache+filter 계산, ancestor expand, JSON section 조립 분기
  - `tests/reactInspector/controllerFlowInteractionWiring.test.ts`: `controllerFlowInteractionWiring.ts`의 list/detail/search/selection 핸들러 결선과 detail queue reset 핸들 노출 분기
  - `tests/reactInspector/hookTreeModel.test.ts`: `hookTreeModel.ts`/`hookTreeNormalization.ts`/`hookTreeBuilders.ts`의 explicit group path 트리, fallback group 빌드, group->groupPath 보정 분기
  - `tests/panel/controllerWiring.test.ts`: `controllerWiring.ts`가 panel bootstrap 핸들을 생성하는 최소 결선 smoke test
  - `tests/panel/controllerContext.test.ts`: `controller/context.ts`의 DOM ref 초기화 가드, picker 버튼 상태 토글, lifecycle handle setter/getter 분기
  - `tests/reactInspector/searchTextCache.test.ts`: `searchTextCache.ts`의 토큰 생성, 캐시 재사용/재빌드, 단일 인덱스 patch 분기
  - `tests/reactInspector/searchFilter.test.ts`: `searchFilter.ts`의 terms 매칭 + 조상 가시성 포함, 조상 펼침, 접힘 id 복원 분기
  - `tests/reactInspector/resetStateFlow.test.ts`: `resetStateFlow.ts`의 상태/캐시 초기화와 reset pane 상태 반영 분기
  - `tests/reactInspector/noResultStateFlow.test.ts`: `noResultStateFlow.ts`의 searchInput/inspectResult 문구와 hover-preview/하이라이트 처리 분기
  - `tests/lifecycle/fatalErrorView.test.ts`: `fatalErrorView.ts`의 body 초기화/에러 메시지 렌더 분기
  - `tests/lifecycle/panelWorkspaceInitialization.test.ts`: `panelWorkspaceInitialization.ts`의 workspace manager/wheel fallback 초기화 결선 분기
  - `tests/lifecycle/runtimeMessageBinding.test.ts`: `runtimeMessageBinding.ts`의 runtime listener add/remove 결선 분기
  - `tests/lifecycle/panelTeardownFlow.test.ts`: `panelTeardownFlow.ts`의 unload 자원 해제(workspace/wheel/runtime message listener/runtime scheduler/nav listener) 분기
  - `tests/runtimeRefresh/panelRuntimeRefreshFlow.test.ts`: `panelRuntimeRefreshFlow.ts`의 scheduler 결선과 navigation reset/foreground refresh 처리
  - `tests/runtimeRefresh/scheduler.test.ts`: `scheduler.ts`의 debounce 병합, min interval 보장, in-flight queued 실행, `reset`/`dispose` 상태 정리 분기
  - `tests/panel/controllerRuntime.test.ts`: `controller/runtime.ts`의 runtime refresh/picker/teardown 결선과 runtime listener remove handle 저장 분기
  - `tests/panel/controllerBootstrap.test.ts`: `controller/bootstrap.ts`의 workspace initialization + bootstrap flow 결선(컨텍스트 getter 주입) 분기
  - `tests/workspace/workspaceFlows.test.ts`: `dragDropFlow.ts`, `resizeFlow.ts`의 이벤트 전이/상태 정리/persist 호출
  - `tests/workspace/workspaceDockLogic.test.ts`: `dragOverTarget.ts`, `dockDropApply.ts`의 drop target 계산과 레이아웃 변경 분기
  - `tests/workspace/workspaceLayoutModelModules.test.ts`: `layoutTypes.ts`/`layoutTreeOps.ts`/`layoutVisibility.ts`의 path/parse, prune/dedupe, visible id 산출 분기
  - `tests/workspace/workspaceActionHandlers.test.ts`: `actionHandlers.ts`의 summary action(toggle/close), summary 기본 click 차단, toggle bar 상태 전환 분기
  - `tests/workspace/workspaceRenderPipeline.test.ts`: `renderPipeline.ts`의 empty fallback 재사용, patch root 삽입, stale child 정리 분기
  - `tests/workspace/workspaceRenderFlow.test.ts`: `renderFlow.ts`의 panel state 반영, toggle bar 동기화, panel open toggle 분기
  - `tests/workspace/workspacePanelBodySizeObserver.test.ts`: `panelBodySizeObserver.ts`의 observe 대상 등록과 start/stop disconnect 생명주기 분기
  - `tests/workspace/workspaceInteractionBindings.test.ts`: `interactionBindings.ts`의 panel/container 이벤트 바인딩과 cleanup unbind 분기
  - `tests/workspace/workspaceLayoutReconcile.test.ts`: `layoutReconcile.ts`의 prune/dedupe/visible panel append 정합화 분기
  - `tests/workspace/workspaceManagerLayoutState.test.ts`: `managerLayoutState.ts`의 panel state 전이/도킹 적용/split ratio persist와 persist+render 호출 규칙 분기
  - `tests/workspace/workspaceManagerInteractionHandlers.test.ts`: `managerInteractionHandlers.ts`의 panel/container 핸들러 매핑 결선 분기
  - `tests/workspace/workspaceManagerLifecycle.test.ts`: `managerLifecycle.ts`의 init 순서(restore/bind/observer/render), 재초기화 시 unbind 교체, destroy 정리 순서 분기
  - `tests/workspace/workspaceManagerInteractionFlowWiring.test.ts`: `managerInteractionFlowWiring.ts`의 drag/resize/action flow 결선 호출과 dock-drop/split ratio persist 콜백 전달 분기
  - `tests/pane/paneSetters.test.ts`: `paneSetters.ts`의 output/react/dom pane setter와 list/detail empty signature 결선 분기
  - `tests/reactInspector/signatures.test.ts`: `signatures.ts`의 internal meta key 제외 해시, detail signature 변경 감지, list signature query/접힘 상태 반영 분기
  - `tests/reactInspector/jsonObjectPreview.test.ts`: `jsonObjectPreview.ts`의 배열 depth collapse, entry cap, object meta key 필터 preview 분기
  - `tests/reactInspector/collectionDisplay.test.ts`: `collectionDisplay.ts`의 map/set token 정규화, display path/meta 읽기, map entry pair 파싱 분기
  - `tests/reactInspector/jsonObjectArraySummary.test.ts`: `jsonObjectArraySummary.ts`의 hooks/props summary meta 계산(map/set/array/object) 분기
  - `tests/reactInspector/jsonObjectArrayChildren.test.ts`: `jsonObjectArrayChildren.ts`의 primitive row fallback, internal meta key 제외, expandable child row/path 전달 분기
  - `tests/reactInspector/jsonPreviewCollection.test.ts`: `jsonPreviewCollection.ts`의 summary/hook collection limit preset(set array 3 vs 4)과 non-collection null 반환 분기
  - `tests/reactInspector/jsonPreviewPrimitive.test.ts`: `jsonPreviewPrimitive.ts`의 primitive/hook inline/dehydrated fallback 포맷 분기
  - `tests/reactInspector/jsonPreviewTokenStrategies.test.ts`: `jsonPreviewTokenStrategies.ts`의 summary/hook token(function/circular/dehydrated) 분기
  - `tests/reactInspector/jsonPreviewBudget.test.ts`: `jsonPreviewBudget.ts`의 budget 생성 정규화, consume, exhausted 판정 분기
  - `tests/reactInspector/jsonPreview.test.ts`: `jsonPreview.ts`의 dehydrate fallback, map/set collection preview, display collection meta(set) limit, internal meta 필터링
  - `tests/reactInspector/jsonRefMap.test.ts`: `jsonRefMap.ts`의 nested ref id 수집, 내부 meta key 제외, 순환 참조 안전 스캔 분기
  - `tests/reactInspector/jsonHookTreeRenderer.test.ts`: `jsonHookTreeRenderer.ts`의 expandable hook row 렌더, group 재귀 렌더, hook state path 전달 분기
  - `tests/content/pageAgentDomTree.test.ts`: `pageAgentDomTree.ts`의 unknown payload 안전 처리, 대상 미발견 에러 처리, DOM tree 직렬화 기본 경로
  - `tests/content/pageAgentDomSelectors.test.ts`: DOM path/css selector 생성과 selector fallback target resolve 분기
  - `tests/content/pageAgentDomHighlight.test.ts`: `pageAgentDomHighlight.ts`의 highlight/preview 스타일 적용, clear 복원, selector 미발견 에러 처리
  - `tests/content/pageAgentDomHighlightState.test.ts`: style snapshot restore/clear와 selector 미발견 실패 분기
  - `tests/content/elementPickerBridge.test.ts`: `elementPickerBridge.ts`의 pageAgent script load 실패 후 재주입, load 성공 후 injected 고정 분기
  - `tests/content/elementPickerPageAgentClient.test.ts`: `elementPickerPageAgentClient.ts`의 request/response resolve, error reject, stop listener cancel 분기
  - `tests/content/pageAgentHookDispatcher.test.ts`: `pageAgentHookDispatcher.ts`의 useState cursor 전진, `use` promise unresolved/resolved 처리, context snapshot, generic hook fallback 분기
  - `tests/content/pageAgentHookState.test.ts`: hook 이름 추론(queue/reducer/memoizedState 패턴)과 Ref state display 정규화 분기
  - `tests/content/pageAgentInspectPathArgs.test.ts`: `reactInspectPath` 입력 파싱(componentId/path/mode/serializeLimit clamp) 분기
  - `tests/content/pageAgentInspectPathFlow.test.ts`: `inspectReactPath`의 serialize/inspectFunction/path 실패/special segment 처리
  - `tests/content/pageAgentInspectComponentsRoot.test.ts`: root 해석 실패 응답, lightweight fallback root 재탐색 분기, pickPoint 우선(stale selected id fallback 차단) 분기
  - `tests/content/pageAgentInspectComponentsResult.test.ts`: walked components에서 selectedIndex/source summary 계산 분기
  - `tests/content/pageAgentInspectComponentsFlow.test.ts`: `reactInspect` 입력 파싱/nearest source summary/기본 selectedIndex/nearest 미해석 에러 분기
  - `tests/content/pageAgentInspect.test.ts`: `createPageAgentInspectHandlers` 결선 후 `reactInspect`/`reactInspectPath` 기본 가드 에러 + roundtrip(component 목록 id -> inspectPath serialize) 회귀 분기
  - `tests/content/pageAgentBridge.test.ts`: bridge request 유효성 통과 시 성공 응답, executeMethod 예외 시 실패 응답, unrelated/invalid request 무시, non-string method 문자열 정규화 분기
  - `tests/content/runtimeMessaging.test.ts`: `sendRuntimeMessageSafe`의 sync throw/promise-like catch 처리와 picker/runtime notify payload 분기
  - `tests/content/pageAgentTargetFetch.test.ts`: targetPath 비어있음/autoDiscover 비활성 에러/zero-arg 자동탐색 + 예외 결과 포맷 분기
  - `tests/content/pageAgentInspectTarget.test.ts`: `resolveInspectRootContext`/`resolveInspectPathTargetFiber`의 nearest fallback 및 문서 전역 componentId fallback 분기
  - `tests/content/pageAgentFiberSearch.test.ts`: componentId 기반 root/fiber 탐색(root match, legacy index, 문서 전역 탐색) 분기
  - `tests/content/pageAgentHookGrouping.test.ts`: 공통 조상 frame 탐색, primitive frame index 보정, group path 추론, primitive 이름 정규화 분기
  - `tests/content/pageAgentHookGroupRuntimeContext.test.ts`: hook group inspect runtime 컨텍스트 해석(null/class fiber/dispatcher 미존재/정상) 분기
  - `tests/content/pageAgentHookInspectContext.test.ts`: inspect context(dispatcher/state/warmup cache) 초기화 분기
  - `tests/content/pageAgentHookMetadata.test.ts`: custom hook metadata 병합(fallback slot 확장/groupPath 정규화/primitive override) 분기
  - `tests/content/pageAgentHookDispatcherMethods.test.ts`: dispatcher built-in method(`useSyncExternalStore`, `useTransition`, `use`) 분기
  - `tests/content/reactRuntimeHookLifecycle.test.ts`: runtime hook 설치/세터 인터셉트/commit throttle/beforeunload 정리 분기
  - `tests/content/pageAgentHooksInfo.test.ts`: hook linked-list 정규화, class component payload 직렬화, includeCustomGroups 옵션 payload 안전 fallback 분기
  - `tests/content/pageAgentSerializationCore.test.ts`: serializer 내부키 매핑, class name 판별, dehydrated 토큰 생성, 순환참조 저장소 동작
  - `tests/content/pageAgentSerializationCoreModules.test.ts`: serializer core 분해 모듈(internal key/dehydrated/seen store) 직접 검증
  - `tests/content/pageAgentSerializationStrategies.test.ts`: array/map/set/object serializer strategy의 truncation/예외 처리/내부키 매핑
  - `tests/content/pageAgentSerializationValuePrimitives.test.ts`: primitive/function token과 Element/Window special-object probe 분기
  - `tests/content/pageAgentSerializationPropsHelpers.test.ts`: host/non-host props budget 계산, children summary/truncation, getter throw guard 분기
  - `tests/content/pageAgentSerializationValueProps.test.ts`: `makeSerializer`와 `serializePropsForFiber`의 depth/circular/maxSerializeCalls/host props truncation 분기
  - `tests/workspace/layoutTreeModules.test.ts`: `layoutTreeCollect`/`layoutTreeTransform`/`layoutTreeNormalize`의 append/remove/insert/prune/dedupe 분기
  - `tests/background/messageRouter.test.ts`: background message router의 start/callPageAgent/runtime relay 분기
  - `tests/panel/devtoolsNetworkBridge.test.ts`: inspected tab id 조회와 onNavigated listener add/remove 브리지 분기
  - `tests/reactInspector/fetchStages.test.ts`: `fetchRequestStage`/`fetchResponseStage`의 lookup·loading·finish 결선 분기
  - `tests/reactInspector/listTreeNodeRenderer.test.ts`: components tree row toggle/hover/focus/select 이벤트 결선 분기
  - `tests/reactInspector/jsonDehydratedNode.test.ts`: dehydrated token lazy expand/runtime refresh replacement 분기
