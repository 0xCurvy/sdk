# Third-party notices

The Curvy SDK (`@0xcurvy/curvy-sdk`) is released under the MIT License (see
`LICENSE`), Copyright (c) 2026 Curvy Protocol d.o.o.

It contains code adapted from, and its published npm package bundles, the
third-party software listed below. Each keeps its own license; the copyright
and license notices those licenses require are reproduced here.

---

## Adapted in this repository

### tiny-invariant - MIT

Copyright (c) 2019 Alexander Reardon
<https://github.com/alexreardon/tiny-invariant>

- `src/utils/invariant.ts` - adapted; the `process` reference is guarded so it
  runs in browser and `platform: neutral` builds.

Licensed under the MIT License (text below).

---

## Bundled into the published npm package

The build (`tsup.config.ts`, `noExternal`) inlines the Privacy Pass client and
its small codec dependencies into `dist/`, because they are ESM-only and the
CommonJS build cannot `require()` them. They are not part of this repository's
source; versions are those pinned by the lockfile at the time of writing.

| Package | Version | License | Copyright |
|---|---|---|---|
| [@cloudflare/privacypass-ts](https://github.com/cloudflare/privacypass-ts) | 0.9.0 | Apache-2.0 | Copyright (c) 2023 Cloudflare, Inc. |
| [@cloudflare/blindrsa-ts](https://github.com/cloudflare/blindrsa-ts) | 0.4.5 | Apache-2.0 | Copyright (c) 2023 Cloudflare, Inc. |
| [@cloudflare/voprf-ts](https://github.com/cloudflare/voprf-ts) | 1.0.0 | BSD-3-Clause | Copyright (c) 2021 Cloudflare, Inc. and contributors |
| [asn1js](https://github.com/PeculiarVentures/asn1.js) | 3.0.5 | BSD-3-Clause | Copyright (c) 2014, GMO GlobalSign; Copyright (c) 2015-2022, Peculiar Ventures |
| [pvtsutils](https://github.com/PeculiarVentures/pvtsutils) | 1.3.6 | MIT | Copyright (c) 2017-2024 Peculiar Ventures, LLC |
| [pvutils](https://github.com/PeculiarVentures/pvutils) | 1.1.5 | MIT | Copyright (c) 2016-2019, Peculiar Ventures |
| [quicvarint](https://www.npmjs.com/package/quicvarint) | 0.1.4 | MIT | Copyright (c) 2025 Thibault Meunier |
| [rfc4648](https://github.com/swansontec/rfc4648.js) | 1.5.3 | MIT | Copyright (c) 2022 William R Swanson |
| [asn1-parser](https://git.coolaj86.com/coolaj86/asn1-parser.js) | 1.1.8 | MPL-2.0 | No copyright notice published upstream |
| [tslib](https://github.com/Microsoft/tslib) | 2.7.0 | 0BSD | Copyright (c) Microsoft Corporation |

- **Apache-2.0** components: the license text is in `LICENSES/Apache-2.0.txt`.
- **BSD-3-Clause** and **MIT** components: the license texts are below, and
  apply with the copyright notices in the table.
- **MPL-2.0** (`asn1-parser`): distributed unmodified under the Mozilla Public
  License 2.0 (`LICENSES/MPL-2.0.txt`). Its source code is available at
  <https://git.coolaj86.com/coolaj86/asn1-parser.js> and in the
  [`asn1-parser` npm package](https://www.npmjs.com/package/asn1-parser).
- **0BSD** (`tslib`): no attribution is required; listed for completeness.

The Node.js build also inlines `@0xcurvy/rs-core-wasm` (MIT, Copyright (c)
2026 Curvy Protocol d.o.o.). Its own third-party attributions are listed in
[rs-core's THIRD-PARTY-NOTICES.md](https://github.com/0xCurvy/rs-core/blob/main/THIRD-PARTY-NOTICES.md).

---

## Runtime dependencies

All other dependencies in `package.json` (for example `viem`, `ethers`,
`@solana/kit`, `@noble/hashes`) are installed by the consumer's package
manager, not redistributed with the SDK, and remain under their own licenses.

---

## License texts

### MIT License

```
Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

### BSD 3-Clause License

```
Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:

1. Redistributions of source code must retain the above copyright notice, this
   list of conditions and the following disclaimer.

2. Redistributions in binary form must reproduce the above copyright notice,
   this list of conditions and the following disclaimer in the documentation
   and/or other materials provided with the distribution.

3. Neither the name of the copyright holder nor the names of its
   contributors may be used to endorse or promote products derived from
   this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
```
