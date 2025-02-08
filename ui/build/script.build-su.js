process.env.NODE_ENV = 'production'

import { green } from 'kolorist'
import { version, createFolder } from './build.utils.js'

const type = process.argv[ 2 ]
const subtype = process.argv[ 3 ]

/*
  Build:
  * all: yarn build     / npm run build
  * js:  yarn build js  / npm run build js
  * css: yarn build css / npm run build css
 */

console.log()

if (!type) {
  await import('./script.clean.js')
}
else if ([ 'js', 'css' ].includes(type) === false) {
  console.error(` 无法识别的构建类型: ${ type }`)
  console.error(' 可用: js | css')
  console.error()
  process.exit(1)
}

console.log(` 📦 Building Quasar ${ green(`v${ version }`) }...\n`)

createFolder('dist')

if (!type || type === 'js') {
  createFolder('dist/vetur')
  createFolder('dist/api')
  createFolder('dist/transforms')
  createFolder('dist/lang')
  createFolder('dist/icon-set')
  createFolder('dist/types')
  createFolder('dist/web-types')

  import('./script.build.javascript-su.js').then(
    ({ buildJavascript }) => buildJavascript(subtype || 'full')
  )
}

if (!type || type === 'css') {
  import('./script.build.css-su.js').then(
    ({ buildCss }) => buildCss(type === 'css')
  )
}
