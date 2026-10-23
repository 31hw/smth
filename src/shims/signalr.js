export class HubConnectionBuilder {
  withUrl() {
    return this;
  }
  withAutomaticReconnect() {
    return this;
  }
  build() {
    return {
      on() {},
      off() {},
      start() {
        return Promise.resolve();
      },
      stop() {
        return Promise.resolve();
      },
      invoke() {
        return Promise.resolve();
      },
    };
  }
}
