# Specterfold

[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Demo](https://img.shields.io/badge/demo-specterfold--co.vercel.app-111111.svg)](https://specterfold-co.vercel.app)

**Type, folded in light.** 摺進光裡的字.

Specterfold is a browser lab for variable fonts. It is **OpenX series project 03**: load a variable face, set a line, and watch the axes fold the letterforms into a spectrum. The studio runs entirely in the browser.

**Demo:** [https://specterfold-co.vercel.app](https://specterfold-co.vercel.app) — production alias for the Vercel project. It serves after the first deploy from `main`.

MIT licensed. A hosted Pro bench — saved libraries, shared rooms — can come later. This repository is the open instrument. It is not a foundry, a licensing marketplace, or a font CMS.

## Run locally

```bash
npm install
npm run dev
```

Open the URL Next prints (default [http://localhost:3000](http://localhost:3000)).

```bash
npm test
npm run build
npm start
```

`npm test` checks the font-table parser. Axis discovery for uploads reads the `fvar` and `name` tables. WOFF2 is brotli-decoded in the browser; the bytes are not uploaded.

No environment variables are required.

## What you can do

- Pick a variable face from a small Google Fonts shelf, or drop in a `.woff2`, `.woff`, `.ttf`, or `.otf`.
- Edit the line. Five sample strings are ready, including the tagline.
- Move weight, width, slant, optical size, and whatever custom axes the file actually has.
- See the **fold**: horizontal pleats. Weight sets how many, width (or optical size) sets the throw, slant shears the stack, custom axes rotate the spectrum.
- Keep two poses, compare them, and play a morph from A to B.
- Start from three folds — Noon prism, Night crease, Hairline — with no upload.
- Export PNG, a self-contained SVG (the font is embedded), and a short WebM of the morph.
- Copy a link. The query string holds the font id, the line, and both poses. A local file cannot travel with the link.

## Shelf

Fraunces, Bodoni Moda, Newsreader, Literata, Source Serif 4, Bricolage Grotesque, Anybody, Recursive, Roboto Flex, Commissioner, Climate Crisis, Handjet.

`scripts/probe-fonts.ts` re-reads those files if a face updates its axes.

## Deploy on Vercel

The app is a Next.js App Router project. No environment variables.

1. Import [github.com/whynotartmoney/specterfold-co](https://github.com/whynotartmoney/specterfold-co).
2. Framework preset: **Next.js**.
3. Build command: `npm run build`. Leave the output directory on the Next.js default.
4. Deploy. Production alias: [https://specterfold-co.vercel.app](https://specterfold-co.vercel.app).

Google Fonts CSS is fetched from a route handler so the browser can read the file URLs. Uploaded fonts stay on the client.

## 繁體中文

**一句話：** 瀏覽器裡的可變字體實驗室。OpenX 系列第 03 號：載入一個可變字體，寫一行字，看軸線把字形摺成光譜。

**線上示範：** [https://specterfold-co.vercel.app](https://specterfold-co.vercel.app)（`main` 第一次部署後才會開啟）

**本地執行：** `npm install` 之後 `npm run dev`，打開 Next 印出的網址（預設 [http://localhost:3000](http://localhost:3000)）。`npm test` 檢查字體表解析，`npm run build` 做正式建置。不需要環境變數。字體檔在瀏覽器裡解析，不會上傳。

授權為 [MIT](LICENSE)。

## Out of scope

Full foundry CMS, paid licensing, and accounts. The colophon in the app says the same thing.

## License

[MIT](LICENSE) © 2026 Specterfold. OpenX series project 03.
