interface RuntimeMessage {
  action: string;
  tabId?: number;
  elementInfo?: unknown;
  reason?: string;
  method?: string;
  args?: unknown;
}

type RuntimeSendResponse = (response: Record<string, unknown>) => void;

export type { RuntimeMessage, RuntimeSendResponse };
