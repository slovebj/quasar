/**
 * UMD entry-point
 */

import installQuasar from './install-quasar-su.js'
import lang from './lang-su.js'
import iconSet from './icon-set-su.js'

import * as components from './components.js'
import * as directives from './directives.js'
import * as plugins from './plugins.js'
import * as utils from './utils.js'
import * as composables from './composables.js'

export default {
  version: __QUASAR_VERSION__,
  install (app, opts) {
    installQuasar(app, {
      components,
      directives,
      plugins,
      ...opts
    })
  },
  lang,
  iconSet,
  ...components,
  ...directives,
  ...plugins,
  ...composables,
  ...utils
}
