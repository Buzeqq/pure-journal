import { Hono as Homo } from 'https://deno.land/x/hono@v3.12.2/mod.ts';
import { stream } from "https://deno.land/x/hono@v3.12.2/helper.ts";
import { serveStatic } from "https://deno.land/x/hono@v3.12.2/adapter/deno/serve-static.ts";
import { JsonSeqDecoderStream } from './json-seq-decoder-stream.ts';

const app = new Homo();

app.use('/static/*', serveStatic({ root: './' }));
app.get('/', (c) => {
  const { res: { headers }} = c
  headers.set('Content-Type', 'text/html;charset=UTF-8');
  headers.set('Cache-Control', 'no-cache');

  return stream(c, async (stream) => {
    const { stdout } = new Deno.Command('journalctl', {
      args: ['-o', 'json-seq', '-f', '-u', 'web-api-test'],
      stdout: 'piped'
    }).spawn();

    await stream.write('<!DOCTYPE html>');
    await stream.write('<html lang="en">');
    await stream.write('<head>' +
      '<title>Pure HTML Journal</title>' +
      '<link rel="stylesheet" href="static/styles.css">' +
      '<script async type="module" src="static/main.js"></script>' +
      '</head>');

    await stream.write('<a href="javascript:window.scrollTo(0, document.body.scrollHeight)" class="bottom">Back to Bottom &DownArrow;</a>');

    const journal = stdout.pipeThrough(new TextDecoderStream())
      .pipeThrough(new JsonSeqDecoderStream());

    for await (const journalLine of journal) {
      const values = Object.entries(journalLine).map(([, value]) => `<td>${value}</td>`).join(' ');
      await stream.write(`<tr>${values}</tr>`);
    }

    await stream.write('</table>');
    await stream.write('</html>');

    await stream.close();
  });
});

Deno.serve(app.fetch);
