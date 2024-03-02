const asciiRecordSeparatorCharacter = String.fromCharCode(30);
const newLineCharacter = String.fromCharCode(10);

class JsonSeqTransformer<T> implements Transformer<string, T> {
  private internalBuffer = '';

  public transform(chunk: string, controller: TransformStreamDefaultController<T>) {
    this.internalBuffer += chunk;

    let startIndex;
    let stopIndex;
    do {
      startIndex = this.internalBuffer.indexOf(asciiRecordSeparatorCharacter);
      stopIndex = this.internalBuffer.indexOf(newLineCharacter);

      if (startIndex === -1 || stopIndex === -1) break;

      const payload = this.internalBuffer.substring(startIndex + 1, stopIndex);

      try {
        const object = JSON.parse(payload);
        controller.enqueue(object);
      } catch (e) {
        console.log(`|sheise|${payload}|sheise|`);
        throw e;
      }

      this.internalBuffer = this.internalBuffer.substring(stopIndex + 1, this.internalBuffer.length);
    } while (true);
  }
}

export class JsonSeqDecoderStream extends TransformStream {
  constructor() {
    super(new JsonSeqTransformer());
  }
}
