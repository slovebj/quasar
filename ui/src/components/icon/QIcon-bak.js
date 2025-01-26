import { h, computed } from 'vue'

import useSize, { useSizeProps } from '../../composables/private.use-size/use-size.js'

import { createComponent } from '../../utils/private.create/create.js'
import { hSlot, hMergeSlot } from '../../utils/private.render/render.js'

const defaultViewBox = '0 0 24 24'

const sameFn = i => i
const ionFn = i => `ionicons ${ i }`

const libMap = {
  'mdi-': i => `mdi ${ i }`,
  'icon-': sameFn, // fontawesome equiv
  'bt-': i => `bt ${ i }`,
  'eva-': i => `eva ${ i }`,
  'ion-md': ionFn,
  'ion-ios': ionFn,
  'ion-logo': ionFn,
  'iconfont ': sameFn,
  'ti-': i => `themify-icon ${ i }`,
  'bi-': i => `bootstrap-icons ${ i }`
}

const matMap = {
  o_: '-outlined',
  r_: '-round',
  s_: '-sharp'
}

const symMap = {
  sym_o_: '-outlined',
  sym_r_: '-rounded',
  sym_s_: '-sharp'
}

const libRE = new RegExp('^(' + Object.keys(libMap).join('|') + ')')
const matRE = new RegExp('^(' + Object.keys(matMap).join('|') + ')')
const symRE = new RegExp('^(' + Object.keys(symMap).join('|') + ')')
const mRE = /^[Mm]\s?[-+]?\.?\d/
const imgRE = /^img:/
const svgUseRE = /^svguse:/
const ionRE = /^ion-/
const faRE = /^(fa-(classic|sharp|solid|regular|light|brands|duotone|thin)|[lf]a[srlbdk]?) /

export default createComponent({
  name: 'QIcon',

  props: {
    ...useSizeProps,

    tag: {
      type: String,
      default: 'i'
    },

    name: String,
    color: String,
    left: Boolean,
    right: Boolean
  },

  setup (props, { slots }) {
    const classes = computed(() =>
      'ic ic-' + props.name
    + (props.left === true ? ' on-left' : '') // TODO Qv3: drop this
    + (props.right === true ? ' on-right' : '')
    + (props.color !== void 0 ? ` text-${ props.color }` : '')
    )
    const sizeStyle = useSize(props)

    return () => {
      const data = {
        class: classes.value,
        style: sizeStyle.value
      }

      return h(props.tag, data, hSlot(slots.default))
    }
  }
})
