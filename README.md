# EC Dev Tool (Chrome Extension)

메인 페이지의 dev 전역 객체(기본: `window.ec_dev_manager`) 메서드를 DevTools 패널에서 버튼으로 호출해 결과를 보기 쉽게 보여주는 Chrome 확장 프로그램입니다.

## 요구사항

- 메인 페이지에서 dev 모드일 때 `window.ec_dev_manager`(또는 설정한 다른 객체)가 존재해야 합니다.

## 빌드 및 로드

```bash
npm install
npm run build
npm test
```

- `npm test`: Vitest 단위 테스트 실행

1. Chrome에서 `chrome://extensions` 열기
2. "개발자 모드" 켜기
3. "압축 해제된 확장 프로그램을 로드합니다"로 이 프로젝트 **루트 폴더** 선택

## 사용 방법

1. `window.ec_dev_manager` 등 대상 객체가 있는 페이지를 연다.
2. F12로 개발자 도구를 연다.
3. 상단 탭에서 **EC Dev Tool** 패널을 선택한다.
4. 패널이 열리면 React 컴포넌트 트리를 자동으로 로드한다.
5. 페이지 이동/새로고침 또는 React commit 이벤트가 감지되면 트리를 자동으로 다시 가져온다.
6. 대상(예: EC Dev Manager)을 선택하고 **데이터 가져오기** 버튼을 누르면 메서드 호출 결과가 표시된다.
7. **Select element**를 누른 뒤 페이지 요소를 클릭하면, React 컴포넌트 체인(선택 요소 기준)이 표시된다.
8. 목록에서 컴포넌트를 클릭하면 해당 컴포넌트의 `props`/`state`를 트리 형태로 확인하고, 페이지의 대응 DOM 요소를 자동 하이라이트한다. React 매핑이 없으면 `DomElement` fallback 노드로 선택 요소를 계속 추적한다.
9. 검색창 옆 **Lite/Full** 버튼으로 React payload 모드를 전환할 수 있다. `Lite`는 빠른 조회, `Full`은 직렬화된 상세 payload를 우선한다.
10. 함수 값은 링크로 표시되며 클릭 시 DevTools inspect/console 대상으로 이동을 시도한다.
11. 순환 참조(`Circular`) 값은 참조 노드 형태로 표시되어 트리에서 확장해 확인할 수 있다.
12. 선택한 요소의 DOM 구조를 **접기/펼치기 가능한 트리**로 확인할 수 있다.
13. React 컴포넌트 섹션 우측 검색창에서 이름/selector/path 기준으로 목록을 필터링할 수 있다.
14. 패널 경계선(Components↔Inspector, Selected Element↔DOM Tree)을 드래그해 영역 폭을 조절할 수 있다.
15. **Debug Log** 패널에는 액션/브리지 요청/응답 로그가 누적되며, `⧉`(전체 복사)와 `⌫`(전체 지우기) 버튼으로 기록을 관리할 수 있다. 오류 이벤트는 라인에 `[ERROR]`로 표시된다.
16. Dev-only diagnostics 뷰가 필요하면 DevTools 콘솔에서 `localStorage.setItem('ecDevTool.devDiagnostics', '1')` 실행 후 패널을 새로 열면 Debug Log 상단에 이벤트 총량/오류 수/최근 이벤트 집계가 표시된다.

## 대상 객체 설정

`src/config.ts`에서 호출할 객체와 메서드를 설정합니다.

- **DEFAULT_TARGET_PATH**: 기본 객체 경로 (예: `ec_dev_manager` → `window.ec_dev_manager`)
- **TARGETS**: 패널 드롭다운에 나올 대상 목록
  - `path`: `window` 기준 경로 (점으로 중첩 가능, 예: `myApp.dev`)
  - `methods`: 호출할 메서드 이름 배열. 안전 모드를 위해 명시적으로 지정하는 것을 권장합니다.
  - `autoDiscoverZeroArgMethods`: `methods`가 비어 있을 때 인자 없는 메서드를 자동 탐지/호출할지 여부 (`true`일 때만 활성화)

다른 객체를 쓰려면 `TARGETS`에 항목을 추가하면 됩니다.

## 프로젝트 구조

```
├── manifest.json       # 확장 매니페스트
├── devtools.html       # DevTools 진입점
├── panel.html          # 패널 UI
├── src/
│   ├── config.ts                         # 대상 객체/메서드 설정
│   ├── features/
│   │   ├── devtools.ts                   # DevTools 패널 생성
│   │   ├── panel.ts                      # 패널 entry
│   │   └── panel/
│   │       ├── controller.ts             # 패널 기능 오케스트레이션 로직
│   │       ├── controller/
│   │       │   ├── bootstrap.ts          # 패널 bootstrap/workspace 초기화 결선
│   │       │   ├── bootstrapBindings.ts  # bootstrap/workspace 결선 입력 바인딩 helper
│   │       │   ├── context.ts            # panel DOM ref/lifecycle mutable 컨텍스트
│   │       │   ├── runtime.ts            # runtime refresh + picker/teardown 결선 조립
│   │       │   ├── runtimePickerFlow.ts  # picker bridge + runtime listener 결선
│   │       │   └── wiring/
│   │       │       ├── controllerWiring.ts            # panel 도메인 결선 오케스트레이션
│   │       │       ├── controllerWiringDebug.ts       # pageAgent/pane debug 래퍼 결선
│   │       │       ├── controllerWiringDataFlows.ts   # target/dom/selection data flow 결선
│   │       │       ├── controllerWiringLifecycle.ts   # runtime+bootstrap lifecycle 결선
│   │       │       ├── controllerWiringLifecycleRefresh.ts # payload mode/fetch preset 결선
│   │       │       ├── controllerWiringPane.ts        # pane setter/debug 바인딩 결선
│   │       │       └── controllerWiringReactInspector.ts # react inspector 결선
│   │       ├── debugLog/                 # Debug Log 누적/복사/초기화 + diagnostics(오류 집계) 플로우
│   │       ├── workspacePanels.ts        # 워크스페이스 패널 ID/메타 정의
│   │       └── workspace/
│   │           ├── layout/
│   │           │   └── layoutModel.ts    # 워크스페이스 레이아웃 트리 모델/연산
│   │           ├── manager.ts            # 워크스페이스 레이아웃/드래그/리사이즈 상태머신
│   │           ├── persistence/
│   │           │   └── statePersistence.ts # 워크스페이스 레이아웃/패널 상태 저장·복원
│   │           ├── render/
│   │           │   └── renderFlow.ts     # 워크스페이스 DOM 렌더/후처리 파이프라인
│   │           ├── state/
│   │           │   └── storage.ts        # 워크스페이스 localStorage 유틸
│   │           └── wheelScrollFallback.ts # 패널 wheel 스크롤 보정
│   ├── content/
│   │   ├── dom/                          # DOM selector/tree/highlight 핸들러 모듈
│   │   ├── elementPicker.ts              # 요소 선택 + content/main world 브릿지
│   │   ├── fiber/                        # React fiber 탐색/식별/레지스트리 모듈
│   │   ├── inspect/
│   │   │   ├── components/               # reactInspect components 입력/루트해석/walk + non-React DomElement fallback 모듈
│   │   │   └── path/                     # reactInspectPath 입력/경로해석/모드응답 모듈
│   │   ├── hooks/                        # hook runtime/metadata/grouping + inspect dispatcher 보조 모듈
│   │   ├── runtime/
│   │   │   ├── pageAgentRuntimeConfig.ts # runtime 기본 옵션(storage key/budget)
│   │   │   ├── pageAgentRuntime.ts # main world runtime 설치 진입점
│   │   │   ├── pageAgentRuntimeBootstrap.ts # method executor 생성 조립
│   │   │   ├── pageAgentRuntimeDomHandlers.ts # DOM handler adapter(unknown payload 경계)
│   │   │   ├── pageAgentRuntimeMethodHandlers.ts # DOM/inspect handler -> method router 결선
│   │   │   ├── pageAgentRuntimeInspectHandlers.ts # inspect 의존성 결선 helper
│   │   │   └── pageAgentRuntimeInstallFlow.ts # bridge/action + executor 설치 플로우
│   │   ├── serialization/                # pageAgent serializer 전략/props/path 토큰 모듈
│   │   ├── reactRuntimeHook.ts           # React commit 감지 훅
│   │   └── pageAgent.ts                  # main world React/DOM inspector 실행기
│   ├── background/
│   │   ├── router/                       # panel/content 요청 라우팅 + 타입
│   │   ├── relay/                        # content -> panel runtime 이벤트 중계
│   │   └── errors/                       # background 메시지 오류 판별 유틸
│   ├── shared/
│   │   ├── index.ts                      # shared 배럴 export
│   │   ├── inspector/
│   │   │   ├── index.ts                  # inspector 타입/가드 배럴 export
│   │   │   ├── types.ts                  # Inspector 공용 타입
│   │   │   ├── guards.ts                 # Inspector 응답/토큰 타입가드
│   │   └── readers/
│   │       ├── index.ts                  # reader 배럴 export
│   │       └── string.ts                 # 안전한 문자열 리더
│   ├── ui/
│   │   ├── components/
│   │   │   ├── actions/                 # 버튼/아이콘 액션 primitive
│   │   │   └── text/                    # 상태/서브타이틀 텍스트 primitive
│   │   ├── panels/
│   │   │   ├── react/                   # React 트리/인스펙터 패널
│   │   │   ├── element/                 # 선택 요소/경로/DOM 패널
│   │   │   └── common/                  # 공통 패널(raw result 등)
│   │   └── sections/                     # 화면 조립 섹션(헤더/푸터/워크스페이스)
└── dist/               # 빌드 결과 (devtools.global.js, panel.global.js)
```

추가로 컴포넌트 트리 탐색 고도화(검색/필터, 상위-하위 이동, live update)를 확장할 수 있습니다.

## UI 디렉터리 규칙

- `src/ui/components/actions`: 버튼/아이콘 액션 primitive
- `src/ui/components/text`: 상태/서브타이틀 텍스트 primitive
- `src/ui/panels/react`: React 트리/인스펙터 패널
- `src/ui/panels/element`: 선택 요소/경로/DOM 패널
- `src/ui/panels/common`: 공통 패널(raw result 등)
- `src/ui/sections/shell`: 헤더/뷰 골격 같은 상위 레이아웃 섹션(`PanelToolbarSection`, `PanelStatusSection` 포함)
- `src/ui/sections/workspace`: 워크스페이스 본문/패널 집합 섹션(`PanelFooterSection`, canvas/panels 포함)

## 인수인계 문서

패널/브리지/런타임 훅 구조와 코드 흐름을 상세히 정리한 문서는 아래를 참고하세요.

- `docs/panel-handover.md`
