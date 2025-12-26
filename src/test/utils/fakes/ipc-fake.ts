import { EventEmitter } from 'events';

type IpcHandler = (event: any, ...args: any[]) => unknown | Promise<unknown>;
type HandlerMap = Map<string, IpcHandler>;

class IpcMainFake extends EventEmitter {
  private readonly handlers: HandlerMap = new Map();
  private defaultSender?: IpcRendererFake;

  handle(channel: string, handler: IpcHandler) {
    this.handlers.set(channel, handler);
  }

  handleOnce(channel: string, handler: IpcHandler) {
    const wrapped: IpcHandler = async (event, ...args) => {
      this.handlers.delete(channel);
      return handler(event, ...args);
    };
    this.handlers.set(channel, wrapped);
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
    return await handler({ sender: this.defaultSender ?? rendererSentinel }, ...args);
  }
}

class IpcRendererFake extends EventEmitter {
  constructor(private readonly main: IpcMainFake) {
    super();
  }

  send(channel: string, ...args: unknown[]) {
    // mimic ipcRenderer.send -> triggers ipcMain listeners
    this.main.emit(channel, { sender: this }, ...args);
  }

  async invoke(channel: string, ...args: unknown[]) {
    return (await this.main.invoke(channel, ...args)) as any;
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
