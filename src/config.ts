/**
 * DevTools 패널에서 호출할 대상 객체 설정.
 * window[path] 또는 중첩 경로(예: 'ec_dev_manager')로 접근합니다.
 * 다른 객체를 쓰려면 targets 에 항목을 추가하면 됩니다.
 *
 * 빌드 시 환경변수로 덮어쓰려면 tsup define 또는 별도 env 파일을 사용하세요.
 */

export interface DevTarget {
  /** 표시 이름 */
  label: string;
  /**
   * window 기준 경로. 점(.)으로 중첩 가능.
   * 예: 'ec_dev_manager' -> window.ec_dev_manager
   * 예: 'myApp.dev' -> window.myApp.dev
   */
  path: string;
  /**
   * 호출할 메서드 이름 목록.
   * 비워 둘 경우 autoDiscoverZeroArgMethods 가 true일 때만 자동 탐지/호출합니다.
   */
  methods?: string[];
  /**
   * methods가 비었을 때, 인자 없는 메서드를 자동 탐지해 호출할지 여부.
   * 기본값은 false(안전 모드)이며, true일 때만 자동 호출합니다.
   */
  autoDiscoverZeroArgMethods?: boolean;
}

/** 기본 사용 대상: window.ec_dev_manager (환경/설정에 따라 쉽게 변경) */
export const DEFAULT_TARGET_PATH = "ec_dev_manager";

export const TARGETS: DevTarget[] = [
  {
    label: "EC Dev Manager",
    path: DEFAULT_TARGET_PATH,
    methods: [], // 안전하게 사용하려면 호출 대상 메서드를 명시하세요.
    autoDiscoverZeroArgMethods: false,
  },
  // 다른 객체 추가 예시:
  // { label: "Other", path: "window.myApp.dev", methods: ["getState"] },
  // { label: "Legacy Auto", path: "legacy.dev", methods: [], autoDiscoverZeroArgMethods: true },
];
