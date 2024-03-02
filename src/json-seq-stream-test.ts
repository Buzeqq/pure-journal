import { assertEquals } from "https://deno.land/std@0.212.0/assert/mod.ts";
import { JsonSeqDecoderStream } from "./json-seq-decoder-stream.ts";

// import { chunks } from "../index.ts";

const recordSeparatorCharacter = String.fromCharCode(30);
const newLineCharacter = String.fromCharCode(10);


Deno.test("JSON Seq stream", async () => {
  // const file = await Deno.open("logs4.txt");
  const { stdout } = new Deno.Command('journalctl', {
    args: ['-o', 'json-seq', '-f', '-u', 'web-api-test'],
    stdout: 'piped'
  }).spawn();
  // const testWatchDog = setTimeout(() => { throw new Error("Test did not finish in expected time") }, 1);

  const seqStream = stdout.pipeThrough(new TextDecoderStream()).pipeThrough(new JsonSeqDecoderStream());

  const readValues = [];

  console.time('benchmark');
  for await (const obj of seqStream) {
    readValues.push(obj);
  }
  console.timeEnd('benchmark');

  // clearTimeout(testWatchDog);

  assertEquals(readValues.length, 10);
});
