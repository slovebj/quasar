import defineReactivePlugin from '../../utils/private/define-reactive-plugin.js'
// no extension on purpose for next one:
import defaultLang from '../../../lang/zh-CN'

function getLocale () {
  const val = Array.isArray(navigator.languages) === true && navigator.languages.length !== 0
    ? navigator.languages[ 0 ]
    : navigator.language

  if (typeof val === 'string') {
    return val.split(/[-_]/).map((v, i) => (
      i === 0
        ? v.toLowerCase()
        : (
            i > 1 || v.length < 4
              ? v.toUpperCase()
              : (v[ 0 ].toUpperCase() + v.slice(1).toLowerCase())
          )
    )).join('-')
  }
}

const Plugin = defineReactivePlugin({
  __langPack: {}
}, {
  getLocale,

  set (langObject = defaultLang, ssrContext) {
    const lang = {
      ...langObject,
      rtl: langObject.rtl === true,
      getLocale
    }

    lang.set = Plugin.set

    if (Plugin.__langConfig === void 0 || Plugin.__langConfig.noHtmlAttrs !== true) {
      const el = document.documentElement
      el.setAttribute('dir', lang.rtl === true ? 'rtl' : 'ltr')
      el.setAttribute('lang', lang.isoName)
    }

    Object.assign(Plugin.__langPack, lang)

    Plugin.props = lang
    Plugin.isoName = lang.isoName
    Plugin.nativeName = lang.nativeName
  },

  install ({ $q, lang, ssrContext }) {
    $q.lang = Plugin.__langPack
    Plugin.__langConfig = $q.config.lang

    if (this.__installed === true) {
      lang !== void 0 && this.set(lang)
    }
    else {
      this.set(lang || defaultLang)
    }
  }
})

export default Plugin
export { defaultLang }
