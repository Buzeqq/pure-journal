import { JsonSeqDecoderStream } from './json-seq-decoder-stream.ts';

async function logic(controller: ReadableStreamDefaultController<string>, signal: AbortSignal) {
  const { stdout } = new Deno.Command('journalctl', {
    args: ['-o', 'json-seq', '-f', '-u', 'web-api-test'],
    stdout: 'piped',
    signal
  }).spawn();

  controller.enqueue('<!DOCTYPE html>');
  controller.enqueue('<html lang="en">');
  controller.enqueue('<head>' +
    '<title>Pure HTML Journal</title>' +
    '<link rel="stylesheet" href="static/styles.css">' +
    '<script async type="module" src="static/main.js"></script>' +
    '</head>');

  controller.enqueue('<a href="javascript:window.scrollTo(0, document.body.scrollHeight)" class="bottom">Back to Bottom &DownArrow;</a>');

  const journal = stdout.pipeThrough(new TextDecoderStream())
    .pipeThrough(new JsonSeqDecoderStream());

  controller.enqueue('<table>');

  let headSent = false;
  for await (const journalLine of journal) {
    if (signal.aborted) return;
    if (!headSent) {
      headSent = true;

      const ths = Object.keys(journalLine).sort().map(x => `<th>${x}</th>`).join('');
      controller.enqueue(`<tr>${ths}</tr>`);
    }

    const collator = Intl.Collator();

    const tds = Object.entries(journalLine).sort(([a], [b]) => collator.compare(b, a)).map(([, value]) => `<td>${value}</td>`).join('');
    controller.enqueue(`<tr>${tds}</tr>`);
  }

  controller.enqueue('</table>');
  controller.enqueue('</html>');
}

async function serveStatic(pathname: string): Promise<Response> {
  try {
    const {readable} = await Deno.open('.' + pathname);

    return new Response(readable, {
      headers: {
        'content-type': pathname.includes('js') ? 'text/javascript' : 'text/css',
      }
    })
  } catch {
    return new Response(undefined, {
      status: 404,
    });
  }
}

function serveLogStream(request: Request): Response {

  const stream = new ReadableStream<string>({
    start: (controller) => logic(controller, request.signal)
  });

  const utf8Stream = stream.pipeThrough(new TextEncoderStream());

  return new Response(utf8Stream, {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-cache',
      'transfer-encoding': 'chunked',
    }
  });
}

async function app(request: Request): Promise<Response> {
  const { pathname } = new URL(request.url);

  return pathname.includes('static')
    ? await serveStatic(pathname)
    : serveLogStream(request);
}

Deno.serve(app);
