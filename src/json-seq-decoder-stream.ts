const asciiRecordSeparatorCharacter = String.fromCharCode(30);
const newLineCharacter = String.fromCharCode(10);

class JsonSeqTransformer<T> implements Transformer<string, T> {
  private internalBuffer: string[] = [];

  public transform(chunk: string, controller: TransformStreamDefaultController<T>) {
    this.internalBuffer.push(chunk);

    let whole = this.internalBuffer.join('');
    const readyToParse = whole.indexOf(asciiRecordSeparatorCharacter) !== -1 && whole.indexOf(newLineCharacter) !== -1;

    if (!readyToParse) {
      return;
    }

    let startIndex = 0;
    while (startIndex !== -1) {
      const newLineIndex = whole.indexOf(newLineCharacter, startIndex);

      const t = whole.slice(startIndex + 1, newLineIndex);
      try {
        const object = JSON.parse(t);
        controller.enqueue(object);
      } catch (e) {
        console.log(`|sheise|${t}|sheise|`);
        throw e;
      }

      whole = whole.slice(newLineIndex + 1);
      startIndex = whole.indexOf(asciiRecordSeparatorCharacter);
      this.internalBuffer = [whole];
    }
  }
}

export class JsonSeqDecoderStream extends TransformStream {
  constructor() {
    super(new JsonSeqTransformer());
  }
}

// const recordSeparatorCharacter = String.fromCharCode(30);
// const newLineCharacter = String.fromCharCode(10);
//
// class JsonSeqTransformer<T> implements Transformer<string, T> {
//   private buffer: string[] = []; // Using vector of strings as string is immutable
//
//   public transform(chunk: string, controller: TransformStreamDefaultController<T>) {
//     this.buffer.push(chunk);
//     console.log(Deno.inspect(this.buffer, { depth: 1_000, colors: true, strAbbreviateSize: Infinity, escapeSequences: false })
//       .replaceAll(String.fromCharCode(30), '<==[KuRwA(PREFIX)]==>')
//       .replaceAll(String.fromCharCode(10), '<==[KuRwA(SUFFIX)]==>'));
//
//     while (this.bufferContainsAtLeastOneWholeSequence()) {
//       const rawSequence = this.extractNextSequenceFromBuffer();
//       const parsedSequence: T = JSON.parse(rawSequence);
//       controller.enqueue(parsedSequence);
//     }
//   }
//
//   private extractNextSequenceFromBuffer(): string {
//     const whole = this.buffer.join('');
//
//     const seqBegin = whole.indexOf(recordSeparatorCharacter) + 1;
//     const seqEnd = whole.indexOf(newLineCharacter, seqBegin);
//
//     const sequence = whole.substring(seqBegin, seqEnd);
//
//     this.buffer = [
//       whole.substring(seqEnd + 1),
//     ];
//
//     return sequence;
//   }
//
//   private bufferContainsAtLeastOneWholeSequence(): boolean {
//     let counter = 0;
//
//     for (const part of this.buffer) {
//       if (part.includes(recordSeparatorCharacter)) counter++;
//       if (part.includes(newLineCharacter)) counter++;
//
//       if (counter == 2) return true;
//     }
//
//     return false;
//   }
// }
//
// export class JsonSeqDecoderStream extends TransformStream {
//   constructor() {
//     super(new JsonSeqTransformer());
//   }
// }
