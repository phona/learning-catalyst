import { EventEmitter } from 'events';

type IpcHandler = (event: { sender: IpcRendererFake }, ...args: unknown[]) => unknown | Promise<unknown>;
type HandlerMap = Map<string, IpcHandler>;

class IpcMainFake extends EventEmitter {
  private handlers: HandlerMap = new Map();
  private defaultSender?: IpcRendererFake;

  handle(channel: string, handler: IpcHandler) {
    this.handlers.set(channel, handler);
  }

  removeHandler(channel: string) {
    this.handlers.delete(channel);
  }

  setDefaultSender(sender: IpcRendererFake) {
    this.defaultSender = sender;
  }

  async invoke(channel: string, ...args: unknown[]) {
    const handler = this.handlers.get(channel);
    if (!handler) {
      throw new Error(`No handler registered for ${channel}`);
    }
    return handler({ sender: this.defaultSender ?? rendererSentinel }, ...args);
  }
}

class IpcRendererFake extends EventEmitter {
  constructor(private main: IpcMainFake) {
    super();
  }

  send(channel: string, ...args: unknown[]) {
    // mimic ipcRenderer.send -> triggers ipcMain listeners
    this.main.emit(channel, { sender: this }, ...args);
  }

  async invoke(channel: string, ...args: unknown[]) {
    return this.main.invoke(channel, ...args);
  }
}

// Sentinel object to avoid a circular import when invoking handlers
const rendererSentinel = new IpcRendererFake(new IpcMainFake());

export const createIpcPair = () => {
  const ipcMain = new IpcMainFake();
  const ipcRenderer = new IpcRendererFake(ipcMain);
  ipcMain.setDefaultSender(ipcRenderer);

  const emitToRenderer = (channel: string, payload?: unknown) => {
    ipcRenderer.emit(channel, { sender: ipcMain }, payload);
  };

  const flushAsync = () => new Promise((resolve) => setTimeout(resolve, 0));

  return { ipcMain, ipcRenderer, emitToRenderer, flushAsync };
};

export type IpcPair = ReturnType<typeof createIpcPair>;
