interface RuntimeMessageBindingOptions<Message> {
  addListener: (listener: (message: Message) => void) => void;
  removeListener: (listener: (message: Message) => void) => void;
}

/** runtime message listener를 결선하고 해제 함수를 반환한다. */
export function bindRuntimeMessageListener<Message>(
  onRuntimeMessage: (message: Message) => void,
  options: RuntimeMessageBindingOptions<Message>,
): () => void {
  options.addListener(onRuntimeMessage);
  return function removeRuntimeMessageListener() {
    options.removeListener(onRuntimeMessage);
  };
}
