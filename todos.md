# Refactoring Todo Tracker

Last Updated: 2026-02-26

## Working Rules

- 각 차수는 여러 작업 단위로 분할한다.
- 각 작업 단위 완료 시 체크박스/노트를 즉시 갱신한다.
- 구조 변경이 있으면 `docs/panel-handover.md`를 함께 동기화한다.

## Phase 83 (In Progress): `pageAgentInspectComponentsFlow` 타입화/분해

- [x] 83.1 입력 파싱/응답 조립 helper 분리
- [x] 83.2 `pageAgentInspectComponentsFlow.ts` `@ts-nocheck` 제거 및 타입 정리
- [ ] 83.3 단위 테스트 추가 + 문서 동기화 + 검증/커밋

## Phase 84 (Planned): `pageAgentInspect.ts` 오케스트레이터 슬림화

- [ ] 84.1 inspect 의존성 타입 모듈 분리
- [ ] 84.2 `reactInspect`/`reactInspectPath` 결선 블록 분리
- [ ] 84.3 `@ts-nocheck` 제거 + 테스트/문서 동기화

## Phase 85 (Planned): page agent runtime/bridge/method 결선 재정리

- [ ] 85.1 `pageAgentRuntime.ts` runtime bootstrap 단계 분리
- [ ] 85.2 `pageAgentBridge.ts` 메시지 파이프라인 분리
- [ ] 85.3 `pageAgentMethods.ts` 메서드 라우팅/target fetch 분리

## Phase 86 (Planned): DOM 계열 타입 안정화

- [ ] 86.1 `pageAgentDom.ts` helper 분리
- [ ] 86.2 `pageAgentDomTree.ts` 타입 정리
- [ ] 86.3 `pageAgentDomHighlight.ts` 상태 처리 분리

## Phase 87 (Planned): Hook inspect 계열 추가 분해

- [ ] 87.1 `pageAgentHookGroups.ts` 세부 흐름 분리
- [ ] 87.2 `pageAgentHooksInfo.ts` 타입 정리
- [ ] 87.3 hook inspect 테스트 보강

## Phase 88 (Planned): Serialization 계열 재정리

- [ ] 88.1 `pageAgentSerializationValue.ts` 전략별 분리
- [ ] 88.2 `pageAgentSerializationProps.ts` 책임 축소
- [ ] 88.3 serializer 테스트 확장

## Phase 89 (Planned): React Inspector JSON preview 분해

- [ ] 89.1 `jsonPreview.ts` primitive/collection/object 전략 분리
- [ ] 89.2 preview 공통 budget/limit 유틸 정리
- [ ] 89.3 관련 테스트 및 문서 동기화

## Phase 90 (Planned): 회귀 안전성 강화

- [ ] 90.1 main-world inspect 흐름 통합 회귀 테스트
- [ ] 90.2 runtime/hook 메시지 edge case 테스트
- [ ] 90.3 잔여 `@ts-nocheck` 제거 상태 재점검
