# Repository Agent Rules

## Scope

이 파일의 규칙은 저장소 전체에 적용됩니다.

## Documentation Sync Policy (Mandatory)

코드가 수정되면 문서와 주석을 함께 동기화합니다.

1. 구조/동작/아키텍처 변경
- 대상 예: `src/**`, `panel.html`, `manifest.json`, `tsup.config.ts`
- 필수: `docs/panel-handover.md` 업데이트

2. 사용자 사용법/설정 변경
- 대상 예: 설치 방법, 패널 동작, 설정 키/경로, 빌드/실행 절차
- 필수: `README.md` 업데이트

3. 복잡 로직 변경
- 대상 예: 상태머신, 브리지/메시지 흐름, 비직관적인 계산/예외 처리
- 필수: 변경 파일에 코드 흐름 주석 보강

4. 완료 보고 규칙
- 최종 응답에 아래를 반드시 포함:
  - 변경된 코드 파일
  - 함께 수정한 문서 파일
  - 문서를 수정하지 않았다면 그 근거

## Commit Convention (Draft)

에이전트가 커밋 메시지를 작성할 때 아래 규칙을 기본으로 사용합니다.

### 1) 기본 형식

`<type>: <subject>`

- `type`: 변경 종류
- `subject`: 한 줄 요약(무엇을 바꿨는지)

예시:

- `feat: add split-layout persistence for workspace`
- `fix: handle missing page agent response timeout`
- `docs: document runtime refresh message flow`

### 2) type 목록

- `feat`: 사용자 기능 추가/확장
- `fix`: 버그 수정
- `refactor`: 동작 변화 없는 구조 개선
- `perf`: 성능 개선
- `docs`: 문서 변경
- `test`: 테스트 추가/수정
- `build`: 빌드/번들/의존성 변경
- `chore`: 기타 유지보수(설정/정리)
- `ci`: CI 설정 변경
- `revert`: 이전 커밋 되돌림

### 3) subject 명확성 규칙

- `subject`는 실제 변경 대상과 행동을 직접 설명한다.
- 제목만 읽어도 변경된 동작이 유추되어야 한다.
- 모호한 문구 금지 (`update`, `fix bug` 단독 사용 금지)

좋은 예시:

- `fix: prevent collapsed split rows from reserving extra height`
- `refactor: split reactInspect response shaping from bridge handler`
- `docs: add runtime refresh troubleshooting checklist`

피해야 할 예시:

- `fix: update code`
- `refactor: cleanup`
- `chore: changes`

### 4) subject 세부 규칙

- 50자 내외 권장, 명령형/현재형으로 작성
- 가능한 한 동사 + 목적어 형태로 작성 (`add`, `remove`, `prevent`, `rename`, `document`)
- 불필요한 마침표 생략

### 5) 본문/푸터 템플릿(선택)

본문이 필요하면 아래 템플릿을 사용합니다.

```
Why:
- 변경 배경/문제

What:
- 핵심 변경점 1
- 핵심 변경점 2

Validation:
- npm run build
- (수동 검증 항목)
```

브레이킹 체인지가 있으면 제목에 `!`를 붙이고 푸터에 명시합니다.

예시:

`feat!: rename workspace panel storage keys`

```
BREAKING CHANGE: workspace localStorage keys changed from v1 to v2
```

### 6) 커밋 단위 규칙

- 하나의 커밋은 하나의 의도(기능/수정/리팩터링)만 포함
- 리팩터링과 기능 변경은 가능하면 분리
- 생성 산출물/로컬 파일(`dist/`, `node_modules/`, `.history/`)은 커밋 금지

## Quick Checklist

- [ ] 코드 변경이 있는가?
- [ ] `docs/panel-handover.md` 반영이 필요한가?
- [ ] `README.md` 반영이 필요한가?
- [ ] 복잡한 변경부에 주석이 충분한가?
- [ ] 최종 보고에 문서 동기화 내역을 적었는가?
