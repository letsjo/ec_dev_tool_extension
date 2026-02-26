export type MethodExecutor = (method: string, args: unknown) => unknown;

export interface CreatePageAgentRuntimeMethodExecutorOptions {
  runtimeWindow: Window;
  componentHighlightStorageKey: string;
  hoverPreviewStorageKey: string;
  fiberIdMapKey: string;
  fiberIdSeqKey: string;
  functionInspectRegistryKey: string;
  functionInspectRegistryOrderKey: string;
  functionInspectSeqKey: string;
  maxTraversal: number;
  maxComponents: number;
  maxFunctionInspectRefs: number;
}
