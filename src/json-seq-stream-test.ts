import { assertEquals } from "https://deno.land/std@0.212.0/assert/mod.ts";
import { JsonSeqDecoderStream } from "./json-seq-decoder-stream.ts";
import { chunks } from "../index.ts";

const recordSeparatorCharacter = String.fromCharCode(30);
const newLineCharacter = String.fromCharCode(10);


Deno.test("JSON Seq stream", async () => {
  const testWatchDog = setTimeout(() => { throw new Error("Test did not finish in expected time") }, 1);

  const stream = new ReadableStream({
    start: controller => {
      const encoder = new TextEncoder();
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk));
      }

      controller.close();
    }
  });

  const seqStream = stream.pipeThrough(new TextDecoderStream()).pipeThrough(new JsonSeqDecoderStream());

  const readValues = [];

  console.time('benchmark');
  for await (const obj of seqStream) {
    readValues.push(obj);
  }
  console.timeEnd('benchmark');

  clearTimeout(testWatchDog);


  assertEquals(readValues.length, 16);
});
