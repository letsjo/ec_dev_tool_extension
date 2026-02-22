/**
 * 패널 엔트리 파일.
 *
 * 흐름 요약:
 * 1. controller의 runPanel을 호출한다.
 * 2. 실제 패널 UI 생성/이벤트 바인딩/런타임 동기화는 controller에서 수행한다.
 */
import { runPanel } from "./panel/controller";

runPanel();
