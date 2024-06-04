import { APP_BASE_HREF } from '@angular/common';
import { CommonEngine } from '@angular/ssr';
import express from 'express';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import bootstrap from './src/main.server';
import { renderApplication } from '@angular/platform-server';
import satori from 'satori';
import {html as toReactElement} from 'satori-html';
import sharp from 'sharp';
import { bootstrapApplication } from '@angular/platform-browser';
import { HelloWorldComponent } from './src/hello-world.component';

// The Express app is exported so that it can be used by serverless Functions.
export function app(): express.Express {
  const server = express();
  const serverDistFolder = dirname(fileURLToPath(import.meta.url));
  const browserDistFolder = resolve(serverDistFolder, '../browser');
  const indexHtml = join(serverDistFolder, 'index.server.html');

  const commonEngine = new CommonEngine();

  server.set('view engine', 'html');
  server.set('views', browserDistFolder);

  server.get('/og-image.png', async(req, res) => {
    const fontFile = await fetch('https://og-playground.vercel.app/inter-latin-ext-700-normal.woff');
    const fontData: ArrayBuffer = await fontFile.arrayBuffer();

    const height = 630;
    const width = 1200;
    
    const bootstrap = () => bootstrapApplication(HelloWorldComponent);
    const componentHtml = await renderApplication(bootstrap, {
      document: '<app-hello></app-hello>',
      platformProviders: [
        { provide: 'props', useValue: { name: req.query['name'] } }
      ]
    });
    const html = toReactElement(componentHtml);

    const svg = await satori(html, {
      fonts: [
        {
          name: 'Inter Latin',
          data: fontData,
          style: 'normal'
        }
      ],
      height,
      width
    });
    const svgBuffer = Buffer.from(svg);
    const png = sharp(svgBuffer).png().toBuffer();

    const pngBuffer =  await png;

    res.setHeader('Content-type', 'image/png');
    res.send(pngBuffer);
    res.end();
  });

  // Example Express Rest API endpoints
  // server.get('/api/**', (req, res) => { });
  // Serve static files from /browser
  server.get('**', express.static(browserDistFolder, {
    maxAge: '1y',
    index: 'index.html',
  }));

  // All regular routes use the Angular engine
  server.get('**', (req, res, next) => {
    const { protocol, originalUrl, baseUrl, headers } = req;

    commonEngine
      .render({
        bootstrap,
        documentFilePath: indexHtml,
        url: `${protocol}://${headers.host}${originalUrl}`,
        publicPath: browserDistFolder,
        providers: [{ provide: APP_BASE_HREF, useValue: baseUrl }],
      })
      .then((html) => res.send(html))
      .catch((err) => next(err));
  });

  return server;
}

function run(): void {
  const port = process.env['PORT'] || 4000;

  // Start up the Node server
  const server = app();
  server.listen(port, () => {
    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

run();
