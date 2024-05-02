import { h, computed } from 'vue'

import useSize, { useSizeProps } from '../../composables/private.use-size/use-size.js'

import { createComponent } from '../../utils/private/create.js'
import { hSlot } from '../../utils/private/render.js'

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
