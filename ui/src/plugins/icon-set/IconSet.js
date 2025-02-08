import { createReactivePlugin } from '../../utils/private.create/create.js'
import { injectProp } from '../../utils/private.inject-obj-prop/inject-obj-prop.js'

// no extension on purpose for next one:
import iconFont from '../../../icon-set/icon-font'

const Plugin = createReactivePlugin({
  iconMapFn: null,
  __icons: {}
}, {
  set (setObject, ssrContext) {
    const def = { ...setObject }
    def.set = Plugin.set
    Object.assign(Plugin.__icons, def)
  },

  install ({ $q, iconSet, ssrContext }) {
    if ($q.config.iconMapFn !== void 0) {
      this.iconMapFn = $q.config.iconMapFn
      injectProp($q, 'iconMapFn', () => this.iconMapFn, val => { this.iconMapFn = val })
    }

    $q.iconSet = this.__icons

    if (this.__installed === true) {
      iconSet !== void 0 && this.set(iconSet)
    }
    else {
      this.set(iconSet || iconFont)
    }
  }
})

export default Plugin
