// WebKit ships no `ReadableStream[Symbol.asyncIterator]`, and pdf.js reads its
// text stream with `for await`, so all text extraction threw on Safari.

export function patchReadableStreamAsyncIterator(): void {
  if (typeof ReadableStream === "undefined") return;
  if (Symbol.asyncIterator in ReadableStream.prototype) return;

  Object.defineProperty(ReadableStream.prototype, Symbol.asyncIterator, {
    writable: true,
    configurable: true,
    value: function <T>(this: ReadableStream<T>): AsyncIterableIterator<T> {
      const reader = this.getReader();
      return {
        async next(): Promise<IteratorResult<T>> {
          const { done, value } = await reader.read();
          if (done) {
            reader.releaseLock();
            return { done: true, value: undefined };
          }
          return { done: false, value };
        },
        async return(value?: unknown): Promise<IteratorResult<T>> {
          await reader.cancel();
          reader.releaseLock();
          return { done: true, value: value as T };
        },
        [Symbol.asyncIterator]() {
          return this;
        },
      };
    },
  });
}

patchReadableStreamAsyncIterator();
