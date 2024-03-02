import { JsonSeqDecoderStream } from './json-seq-decoder-stream.ts';

async function logic(controller: ReadableStreamDefaultController<string>, params: URLSearchParams, signal: AbortSignal) {
  const fields = params.get('fields')?.split(',') ?? [];
  const args = ['-o', 'json-seq', '-f', '-u', 'web-api-test'];
  if (fields.length) {
    args.push('--output-fields', fields.join(','));
  }
  const { stdout } = new Deno.Command('journalctl', {
    args,
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

  controller.enqueue('<a href="javascript:window.scrollTo(0, document.body.scrollHeight)" class="bottom">&DownArrow;</a>');

  const journal = stdout.pipeThrough(new TextDecoderStream())
    .pipeThrough(new JsonSeqDecoderStream());

  controller.enqueue('<table>');

  const collator = Intl.Collator();
  let headSent = false;
  for await (const journalLine of journal) {
    if (signal.aborted) return;
    const processLine = (columns: string[]) => {
      console.log(params.get('fields'), fields);
      if (fields.length) {
        return columns.filter(x => fields.includes(x));
      }
      return columns.sort( ([a], [b]) => collator.compare(b, a));
    }
    const createRow = (values: string[], type: 'th' | 'td' = 'td') => values.map(v => `<${type}>${v}</${type}>`).join('');
    const filteredKeys = processLine(Object.keys(journalLine));

    if (!headSent) {
      headSent = true;
      const ths = createRow(filteredKeys, 'th');
      controller.enqueue(`<tr>${ths}</tr>`);
    }

    const tds = fields.length
      ? createRow(fields.map(x => journalLine[x]))
      : createRow(Object.values(journalLine));
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
  const params = new URL(request.url);
  const stream = new ReadableStream<string>({
    start: (controller) => logic(controller, params.searchParams, request.signal)
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
