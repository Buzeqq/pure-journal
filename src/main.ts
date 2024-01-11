import { Hono as Homo } from 'https://deno.land/x/hono@v3.12.2/mod.ts';
import { stream } from "https://deno.land/x/hono@v3.12.2/helper.ts";
import { serveStatic } from "https://deno.land/x/hono@v3.12.2/adapter/deno/serve-static.ts";

const app = new Homo();

app.use('/static/*', serveStatic({ root: './' }));
app.get('/', (c) => {
  const { res: { headers }} = c
  headers.set('Content-Type', 'text/html;charset=UTF-8');
  headers.set('Cache-Control', 'no-cache');

  return stream(c, async (stream) => {
    const { stdout: journalStdout } = new Deno.Command('journalctl', {
      args: ['-o', 'json', '-fn', '1', '-u', 'web-api-pure-journal'],
      stdout: 'piped'
    }).spawn();

    const { stdout: jqStdout, stdin: jqStdin } = new Deno.Command('jq',
      {
        args: ['--unbuffered', '-r', 'select(.MESSAGE != null) | .MESSAGE + "|new-line-here|"'],
        stdin: 'piped',
        stdout: 'piped'
      }).spawn();
    void journalStdout.pipeTo(jqStdin);

    await stream.write('<!DOCTYPE html>');
    await stream.write('<html lang="en">');
    await stream.write('<head>' +
      '<title>Pure HTML Journal</title>' +
      '<link rel="stylesheet" href="static/styles.css">' +
      '<script async type="module" src="static/main.js"></script>' +
      '</head>');

    await stream.write('<a href="javascript:window.scrollTo(0, document.body.scrollHeight)" class="bottom">Back to Bottom &DownArrow;</a>');
    await stream.write('<table>');

    const journal = jqStdout
      .pipeThrough(new TextDecoderStream());

    for await (const journalLine of journal) {
      try {
        for (const x of journalLine.split('|new-line-here|')) {
          const parsed = JSON.parse(x);
          const values = Object.entries(parsed).map(([, value]) => `<td>${value}</td>`).join(' ');
          await stream.write(`<tr>${values}</tr>`);
        }

      } catch (e) { /* empty */ }
    }

    await stream.write('</table>');
    await stream.write('</html>');

    await stream.close();
  });
});

Deno.serve(app.fetch);
