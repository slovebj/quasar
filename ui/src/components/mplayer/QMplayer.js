import {
  computed,
  getCurrentInstance,
  h,
  // nextTick,
  // onBeforeMount,
  onBeforeUnmount,
  reactive,
  ref,
  watch,
  withDirectives
} from 'vue'

import QIcon from '../icon/QIcon.js'
import QBtn from '../btn/QBtn.js'
import QInput from '../input/QInput.js'
import QItem from '../item/QItem.js'
import QItemSection from '../item/QItemSection.js'
import QList from '../item/QList.js'
import QMenu from '../menu/QMenu.js'
import QSlider from '../slider/QSlider.js'
import QSpinner from '../spinner/QSpinner.js'
import QTooltip from '../tooltip/QTooltip.js'
// import QExpansionItem from '../expansion-item/QExpansionItem.js'
import ClosePopup from '../../directives/ClosePopup.js'
// import Ripple from '../../directives/Ripple.js'
import { createComponent } from '../../utils/private/create.js'
import useQuasar from '../../composables/use-quasar.js'
import { hSlot } from '../../utils/private/render.js'

const padTime = (val) => {
  val = Math.floor(val)
  if (val < 10) {
    return '0' + val
  }
  return val + ''
}

const timeParse = (sec) => {
  let min = 0
  min = Math.floor(sec / 60)
  sec = sec - min * 60
  return padTime(min) + ':' + padTime(sec)
}

export default createComponent({
  name: 'QMplayer',

  directives: {
    ClosePopup
    // Ripple
  },

  props: {
    type: {
      type: String,
      required: false,
      default: 'video',
      validator: v => [ 'video', 'audio' ].includes(v)
    },
    // mobileMode: Boolean,
    src: String,
    sources: {
      type: Array,
      default: () => []
    },
    pIndex: {
      type: Number,
      default: 0
    },
    poster: {
      type: String,
      default: ''
    },
    // tracks: {
    //   type: Array,
    //   default: () => []
    // },
    // dense: Boolean,
    autoplay: Boolean,
    crossOrigin: {
      type: [ String ],
      default: null,
      validator: v => v === null || [ 'anonymous', 'use-credentials' ].includes(v)
    },
    volume: {
      type: Number,
      default: 100,
      validator: v => v >= 0 && v <= 100
    },
    // hideVolumeSlider: Boolean,
    // hideVolumeBtn: Boolean,
    // hidePlayBtn: Boolean,
    // hideSettingsBtn: Boolean,
    // hideFullscreenBtn: Boolean,
    disabledSeek: Boolean,
    preload: {
      type: String,
      default: 'auto',
      validator: v => [ 'none', 'metadata', 'auto' ].includes(v)
    },
    // noVideo: Boolean,
    muted: Boolean,
    playsinline: Boolean,
    loop: Boolean,
    // trackLanguage: {
    //   type: String,
    //   default: '关闭' // value for 'Off'
    // },
    showTooltips: Boolean,
    showBigPlayButton: {
      type: Boolean,
      default: true
    },
    showSpinner: {
      type: Boolean,
      default: true
    },
    spinnerSize: String,
    noControls: Boolean,
    // nativeControls: Boolean,
    bottomControls: {
      type: Boolean,
      default: false
    },
    controlsDisplayTime: {
      type: Number,
      default: 4000
    },
    // playbackRates: Array,
    // initial playback rate
    playbackRate: {
      type: Number,
      default: 1
    },
    dark: Boolean,
    radius: {
      type: [ Number, String ],
      default: 0
    },
    contentStyle: [ String, Object ],
    contentClass: [ String, Object ],
    contentWidth: Number,
    contentHeight: Number
  },

  emits: [
    'mPlayer',
    'playbackRate',
    // 'trackLanguage',
    'showControls',
    'volume',
    'muted',
    'fullscreen',
    'networkState',
    'abort',
    'ready',
    'canplaythrough',
    'duration',
    'emptied',
    'ended',
    'error',
    'loadeddata',
    'loadedmetadata',
    'stalled',
    'suspend',
    'loadstart',
    'paused',
    'play',
    'playing',
    'timeupdate',
    'waiting'
  ],

  setup (props, { slots, emit, expose }) {
    const
      vm = getCurrentInstance(),
      $q = useQuasar() || vm.proxy.$q || vm.ctx.$q,
      canRender = ref(true),
      // lang = reactive({
      //   mPlayer: {}
      // }),
      // iconSet = reactive({
      //   mPlayer: {}
      // }),
      $media = ref(null), // $ref - the actual video/audio player
      controls = ref(null), // $ref
      menu = ref(null), // $ref
      blob = ref(null), // $ref
      // media = ref(null), // $ref
      timer = reactive({
        // timer used to hide control during mouse inactivity
        hideControlsTimer: null
      }),
      state = reactive({
        errorText: null,
        controls: false,
        showControls: true,
        inControls: false,
        playMode: 2,
        volume: 100,
        muted: false,
        currentTime: 0.01,
        duration: 1,
        durationTime: '00:00',
        remainingTime: '00:00',
        displayTime: '00:00',
        loadedTime: 0,
        inFullscreen: false,
        loading: true,
        playReady: false,
        autoPlay: false,
        playing: false,
        playbackRates: [
          { label: '2.0X', value: 2 },
          { label: '1.5X', value: 1.5 },
          { label: '1.2X', value: 1.2 },
          { label: '1.0X', value: 1.0 },
          { label: '0.8X', value: 0.8 },
          { label: '0.5X', value: 0.5 }
        ],
        playbackRate: 1,
        // trackLanguage: '关闭',
        showBigPlayButton: true,
        metadataLoaded: false,
        spinnerSize: '5em',
        bottomControls: false
      }),
      // settingsMenuVisible = ref(false),
      allEvents = [
        'abort',
        'canplay',
        'canplaythrough',
        'durationchange',
        'emptied',
        'ended',
        'error',
        'interruptbegin',
        'interruptend',
        'loadeddata',
        'loadedmetadata',
        'loadedstart',
        'pause',
        'play',
        'playing',
        'progress',
        'ratechange',
        'seeked',
        'timeupdate',
        'volumechange',
        'waiting'
      ]

    // Computed

    const __classes = computed(() => {
      return {
        'q-media__fullscreen': state.inFullscreen,
        'q-media__fullscreen--window': state.inFullscreen
      }
    })

    const __renderVideoClasses = computed(() => {
      return {
        'q-media--player': true,
        'q-media--player--bottom-controls': state.bottomControls && state.inFullscreen // !props.dense &&
        // 'q-media--player--bottom-controls--dense': props.dense && state.bottomControls && state.inFullscreen
      }
    })

    const __videoControlsClasses = computed(() => {
      return {
        // 'q-media__controls--dense': !slots.controls && ((state.showControls || props.mobileMode) && props.dense),
        'q-media__controls--standard': !slots.controls && state.showControls, // || props.mobileMode && !props.dense)
        'q-media__controls--hidden': !state.showControls,
        'q-media__controls--bottom-controls': state.bottomControls
      }
    })

    const __audioControlsClasses = computed(() => {
      return {
        // 'q-media__controls--dense': props.dense,
        'q-media__controls--standard': true
        // 'q-media__controls--bottom-controls': state.bottomControls
      }
    })

    const __contentStyle = computed(() => {
      const style = {}
      if (state.inFullscreen !== true) {
        Object.assign(style, __mergeClassOrStyle('style', props.contentStyle))
        if (props.bottomControls === true && style.height === void 0) {
          // const size = props.dense === true ? 40 : 80
          style.height = `calc(100% - ${ __controlsHeight.value }px)`
        }
        if (style.height === void 0) {
          style.height = '100%'
        }
        style.minWidth = '320px'
      }
      return style
    })

    const __volumeIcon = computed(() => {
      if (state.volume > 1 && state.volume < 70 && !state.muted) {
        return 'volume-d'
      }
      else if (state.volume >= 70 && !state.muted) {
        return 'volume-u'
      }
      else {
        return 'muted'
      }
    })

    // const __selectTracksLanguageList = computed(() => {
    //   const tracksList = []
    //   // provide option to turn subtitles/captions/chapters off
    //   const track = {}
    //   track.label = '关闭音轨语言'
    //   track.value = 'off'
    //   tracksList.push(track)
    //   for (let index = 0; index < props.tracks.length; ++index) {
    //     const track = {}
    //     track.label = track.value = props.tracks[ index ].label
    //     tracksList.push(track)
    //   }
    //   return tracksList
    // })

    const __isMediaAvailable = computed(() => $media.value && $media.value.volume !== undefined)

    const __isAudio = computed(() => {
      return props.type === 'audio'
    })

    const __isVideo = computed(() => {
      return props.type === 'video'
    })

    // const __settingsPlaybackCaption = computed(() => {
    //   let caption = ''
    //   state.playbackRates.forEach((rate) => {
    //     if (rate.value === state.playbackRate) {
    //       caption = rate.label
    //     }
    //   })
    //   return caption
    // })

    const __controlsHeight = computed(() => {
      if (controls.value) {
        return controls.value.clientHeight
      }
      return 80 // props.dense ? 40 : 80
    })

    // Watches

    watch(() => $media.value, () => {
      __init()
      emit('mPlayer', $media.value)
    })

    watch(() => props.poster, () => {
      __updatePoster()
    })

    // watch(() => props.sources, () => {
    //   __updateSources()
    // },
    // { deep: true }
    // )

    watch(() => props.src, () => {
      if (props.src && props.src.length > 0) {
        props.sources.push({ title: '(*^__^*)', src: props.src })
        props.pIndex = props.sources.length - 1
      }
    })

    // watch(() => props.sources, () => {
    //   if (props.sources && props.sources.length > 0) {
    //     props.pIndex === 0 ? __updateSources() : props.pIndex = 0
    //   }
    // })

    // watch(() => props.pIndex, () => {
    //   state.pIndex = props.pIndex
    // })

    watch(() => props.pIndex, () => {
      __updateSources()
      state.autoPlay = true
    })

    watch(() => state.playReady, val => {
      if (val && state.autoPlay === true) {
        $media.value.play()
        state.autoPlay = false
      }
    })
    // watch(() => props.tracks, () => {
    //   __updateTracks()
    // },
    // { deep: true }
    // )

    watch(() => props.volume, () => {
      __updateVolume()
    })

    watch(() => props.muted, () => {
      __updateMuted()
    })

    // watch(() => props.trackLanguage, () => {
    //   __updateTrackLanguage()
    // })

    watch(() => props.showBigPlayButton, () => {
      __updateBigPlayButton()
    })

    // watch(() => props.playbackRates, () => {
    //   __updatePlaybackRates()
    // })

    watch(() => props.playbackRate, () => {
      __updatePlaybackRate()
    })

    // watch(() => $route, val => {
    //   exitFullscreen()
    // })

    // watch($q.lang, val => {
    //   __setupLang()
    // })

    // watch($q.iconSet, val => {
    //   __setupIcons()
    // })

    watch(() => $q.fullscreen.isActive, val => {
      // user pressed F11/ESC to exit fullscreen
      if (!val && __isVideo.value && state.inFullscreen) {
        exitFullscreen()
      }
    })

    watch(() => state.playbackRate, val => {
      if (val && __isMediaAvailable.value === true) {
        $media.value.playbackRate = parseFloat(val)
        emit('playbackRate', val)
      }
    })

    // watch(() => state.trackLanguage, val => {
    //   __toggleCaptions()
    //   // eslint-disable-next-line vue/custom-event-name-casing
    //   emit('trackLanguage', val)
    // })

    watch(() => state.showControls, val => {
      if (__isVideo.value && !state.noControls) {
        emit('showControls', val)
      }
    })

    watch(() => state.volume, val => {
      if (__isMediaAvailable.value === true) {
        const volume = parseFloat(val / 100.0)
        if ($media.value.volume !== volume) {
          $media.value.volume = volume
          emit('volume', val)
        }
      }
    })

    watch(() => state.muted, val => {
      emit('muted', val)
    })

    watch(() => state.currentTime, val => {
      if (__isMediaAvailable.value === true && state.playReady) {
        if (isFinite($media.value.duration)) {
          state.remainingTime = timeParse($media.value.duration - $media.value.currentTime)
        }
        state.displayTime = timeParse($media.value.currentTime)
      }
    })

    watch(() => props.bottomControls, val => {
      state.bottomControls = val
      if (val) {
        state.showControls = true
      }
    })

    // watch(() => props.noControls, val => {
    //   state.noControls = val
    //   if (props.nativeControls === true) {
    //     state.noControls = true
    //   }
    // })

    // watch(() => state.inControls, (val) => {
    //   console.log('inControls:', val)
    // })

    // onBeforeMount(() => {
    //   canRender.value = window !== undefined // SSR
    //   if (canRender.value === true) {
    //     __setupLang()
    //     __setupIcons()
    //   }
    // })

    onBeforeUnmount(() => {
      if (canRender.value === true) {
        // make sure not still in fullscreen
        exitFullscreen()

        // make sure noScroll is not left in unintended state
        document.body.classList.remove('no-scroll')

        // __removeSourceEventListeners()
        __removeMediaEventListeners()

        // make sure no memory leaks
        // __removeTracks()
        // __removeSources()
        $media.value = null
      }
    })

    // Public Methods

    function loadFileBlob (fileList) {
      if (fileList && __isMediaAvailable.value === true) {
        if (Object.prototype.toString.call(fileList) === '[object FileList]') {
          const reader = new FileReader()
          reader.onload = (event) => {
            props.sources.push({
              title: fileList[ 0 ].name,
              src: event.target.result
            })
            props.pIndex = props.sources.length - 1
            // $media.value.src = event.target.result
            // __reset()
            // // __addSourceEventListeners()
            // $media.value.load()
            // state.loading = false
          }
          reader.readAsDataURL(fileList[ 0 ])
          // return true
        }
        else {
          /* eslint-disable-next-line no-console */
          console.error('[QMplayer]: loadFileBlob method requires a FileList')
        }
      }
      return false
    }

    function showControls () {
      // no controls - always off
      if (state.noControls) {
        state.showControls = false
        return
      }
      // bottom controls - always on
      if (state.bottomControls) {
        state.showControls = true
        return
      }
      // kill timer, if there is one
      if (timer.hideControlsTimer) {
        clearTimeout(timer.hideControlsTimer)
        timer.hideControlsTimer = null
      }
      // show controls
      state.showControls = true
      // check if hide cursor (fullscreen)
      __checkCursor()
      // set the timer
      if (props.controlsDisplayTime !== -1 && __isVideo.value) { // && !props.mobileMode
        timer.hideControlsTimer = setTimeout(() => {
          // hide controls, but not if menu is showing
          if (state.inControls !== true) { //! __showingMenu() &&
            state.showControls = false
            timer.hideControlsTimer = null
            __checkCursor()
          }
          else {
            showControls()
          }
          // user configured display time (in ms)
        }, props.controlsDisplayTime)
      }
    }

    function hideControls () {
      if (state.inControls) return
      // no controls - always off
      if (state.noControls) {
        state.showControls = false
        return
      }
      // bottom controls - always on
      if (state.bottomControls) {
        state.showControls = true
        return
      }
      // clear timer if there is one
      if (timer.hideControlsTimer) {
        clearTimeout(timer.hideControlsTimer)
      }
      if (props.controlsDisplayTime !== -1) {
        state.showControls = false
        __checkCursor()
      }
      timer.hideControlsTimer = null
    }

    function toggleControls () {
      if (state.bottomControls) {
        return
      }

      if (state.showControls) {
        hideControls()
      }
      else {
        showControls()
      }
    }

    function play () {
      if (__isMediaAvailable.value === true && state.playReady === true) {
        const hasPromise = typeof $media.value.play() !== 'undefined'
        if (hasPromise) {
          $media.value.play()
            .then(() => {
              state.showBigPlayButton = false
              state.playing = true
              __mouseLeaveVideo()
              return true
            })
            .catch((e) => {
            })
        }
        else {
          // IE11 + EDGE support
          $media.value.play()
          state.showBigPlayButton = false
          state.playing = true
          __mouseLeaveVideo()
        }
      }
    }

    function pause () {
      if (__isMediaAvailable.value === true && state.playReady === true) {
        if (state.playing) {
          $media.value.pause()
          state.showBigPlayButton = true
          state.playing = false
        }
      }
    }

    function mute () {
      state.muted = true
      if (__isMediaAvailable.value === true) {
        $media.value.muted = state.muted === true
      }
    }

    function unmute () {
      state.muted = false
      if (__isMediaAvailable.value === true) {
        $media.value.muted = state.muted !== true
      }
    }

    function togglePlay (e) {
      __stopAndPrevent(e)
      if (__isMediaAvailable.value === true && state.playReady === true) {
        if (state.playing) {
          $media.value.pause()
          state.showBigPlayButton = true
          state.playing = false
        }
        else {
          const hasPromise = typeof $media.value.play() !== 'undefined'
          if (hasPromise) {
            $media.value.play()
              .then(() => {
                state.showBigPlayButton = false
                state.playing = true
                __mouseLeaveVideo()
                return true
              })
              .catch((e) => {
              })
          }
          else {
            // IE11 + EDGE support
            $media.value.play()
            state.showBigPlayButton = false
            state.playing = true
            __mouseLeaveVideo()
          }
        }
      }
    }

    function toggleMuted (e) {
      __stopAndPrevent(e)
      state.muted = !state.muted
      if (__isMediaAvailable.value === true) {
        $media.value.muted = state.muted === true
      }
    }

    function toggleFullscreen (e) {
      if (__isVideo.value) {
        __stopAndPrevent(e)
        if (state.inFullscreen) {
          exitFullscreen()
        }
        else {
          setFullscreen()
        }
        emit('fullscreen', state.inFullscreen)
      }
    }

    function setFullscreen () {
      if (!__isVideo.value || state.inFullscreen) {
        return
      }
      if ($q.fullscreen !== void 0) {
        state.inFullscreen = true
        $q.fullscreen.request($media.value.parentNode) // NOTE error Not capable - on iPhone Safari
        document.body.classList.add('no-scroll')
        // nextTick(() => {
        //   forceUpdate()
        // })
      }
    }

    function exitFullscreen () {
      if (!__isVideo.value || !state.inFullscreen) {
        return
      }
      if ($q.fullscreen !== void 0) {
        state.inFullscreen = false
        $q.fullscreen.exit()
        document.body.classList.remove('no-scroll')
        // nextTick(() => {
        //   forceUpdate()
        // })
      }
    }

    function currentTime () {
      if (__isMediaAvailable.value === true && state.playReady === true) {
        return $media.value.currentTime
      }
      return -1
    }

    function setCurrentTime (seconds) {
      if (state.playReady) {
        if (__isMediaAvailable.value === true && isFinite($media.value.duration) && seconds >= 0 && seconds <= $media.value.duration) {
          state.currentTime = $media.value.currentTime = seconds
        }
      }
    }

    function setVolume (volume) {
      if (volume >= 0 && volume <= 100) {
        state.volume = volume
      }
    }

    // Private Methods

    function __reset () {
      if (timer.hideControlsTimer && !state.bottomControls) {
        clearTimeout(timer.hideControlsTimer)
      }
      timer.hideControlsTimer = null
      state.errorText = null
      state.currentTime = 0.01
      state.durationTime = '00:00'
      state.remainingTime = '00:00'
      state.displayTime = '00:00'
      state.duration = 1
      state.playReady = false
      state.playing = false
      state.loading = true
      state.metadataLoaded = false
      // __updateTrackLanguage()
      showControls()
    }

    // function __toggleCaptions () {
    //   __showCaptions(state.trackLanguage)
    // }

    // function __showCaptions (lang) {
    //   if (__isMediaAvailable.value === true && __isVideo.value) {
    //     for (let index = 0; index < $media.value.textTracks.length; ++index) {
    //       if ($media.value.textTracks[ index ].label === lang) {
    //         $media.value.textTracks[ index ].mode = 'showing'
    //         $media.value.textTracks[ index ].oncuechange = __cueChanged
    //       }
    //       else {
    //         $media.value.textTracks[ index ].mode = 'hidden'
    //         $media.value.textTracks[ index ].oncuechange = null
    //       }
    //     }
    //   }
    // }

    function __stopAndPrevent (e) {
      if (e) {
        e.cancelable !== false && e.preventDefault()
        e.stopPropagation()
      }
    }

    // async function __setupLang () {
    //   const isoName = $q.lang.isoName || 'en-US'
    //   let language
    //   try {
    //     // language = require(`./lang/${isoName}`)
    //     language = await __loadLang(isoName)
    //   }
    //   catch (e) {
    //   }

    //   if (language !== void 0 && language.lang !== void 0) {
    //     lang.mPlayer = { ...language.mPlayer }
    //     __updatePlaybackRates()
    //     __updateTrackLanguage()
    //   }
    // }

    // async function __loadLang (lang) {
    //   let langList = {}
    //   if (lang) {
    //     // detect if UMD version is installed
    //     if (window && window.QmPlayer && window.QmPlayer.Component) {
    //       const name = lang.replace(/-([a-z])/g, g => g[ 1 ].toUpperCase())
    //       if (window.QmPlayer.lang && window.QmPlayer.lang[ name ]) {
    //         langList = window.QmPlayer.lang[ name ]
    //       }
    //       else {
    //         /* eslint-disable-next-line no-console */
    //         console.error(`[QmPlayer]: No language loaded called '${ lang }'`)
    //         /* eslint-disable-next-line no-console */
    //         console.error('[QmPlayer]: Be sure to load the UMD version of the language in a script tag before using with UMD')
    //       }
    //     }
    //     else {
    //       try {
    //         const result = await import(
    //           /* webpackChunkName: "[request]" */
    //           `@quasar/quasar-ui-qmPlayer/src/components/lang/${ lang }.js`
    //         )
    //         langList = result.default
    //       }
    //       catch (e) {
    //         /* eslint-disable-next-line no-console */
    //         console.error(`[QmPlayer]: Cannot find language file called '${ lang }'`)
    //       }
    //     }
    //   }
    //   return langList
    // }

    // async function __setupIcons () {
    //   const iconSetName = $q.iconSet.name || 'material-icons'
    //   let icnSet
    //   try {
    //     icnSet = await __loadIconSet(iconSetName)
    //   }
    //   catch (e) {
    //   }
    //   icnSet !== void 0 && icnSet.name !== void 0 && (iconSet.mPlayer = { ...icnSet.mPlayer })
    // }

    // async function __loadIconSet (set) {
    //   let iconsList = {}
    //   if (set) {
    //     // detect if UMD version is installed
    //     if (window && window.QmPlayer && window.QmPlayer.Component) {
    //       const name = set.replace(/-([a-z])/g, g => g[ 1 ].toUpperCase())
    //       if (window.QmPlayer.iconSet && window.QmPlayer.iconSet[ name ]) {
    //         iconsList = window.QmPlayer.iconSet[ name ]
    //       }
    //       else {
    //         /* eslint-disable-next-line no-console */
    //         console.error(`[QmPlayer]: No icon set loaded called '${ set }'`)
    //         /* eslint-disable-next-line no-console */
    //         console.error('[QmPlayer]:Be sure to load the UMD version of the icon set in a script tag before using with UMD')
    //       }
    //     }
    //     else {
    //       try {
    //         const result = await import(
    //           /* webpackChunkName: "[request]" */
    //           `@quasar/quasar-ui-qmPlayer/src/components/icon-set/${ set }.js`
    //         )
    //         iconsList = result.default
    //       }
    //       catch (e) {
    //         /* eslint-disable-next-line no-console */
    //         console.error(`[QmPlayer]: Cannot find icon set file called '${ set }'`)
    //       }
    //     }
    //   }
    //   return iconsList
    // }

    function __init () {
      state.bottomControls = props.bottomControls
      state.noControls = props.noControls
      // if (props.nativeControls === true) {
      //   state.noControls = true
      // }
      // set default track language
      // __updateTrackLanguage()
      __updateSources()
      // __updateTracks()
      // set big play button
      __updateBigPlayButton()
      // set the volume
      __updateVolume()
      // set muted
      __updateMuted()
      // set playback rates
      // __updatePlaybackRates()
      // set playback rate default
      __updatePlaybackRate()
      // does user want cors?
      props.crossOrigin && __isMediaAvailable.value === true && $media.value.setAttribute('crossorigin', props.crossOrigin)
      // make sure "controls" is turned off
      __isMediaAvailable.value === true && ($media.value.controls = false)
      // set up event listeners on video
      __addMediaEventListeners()
      // __addSourceEventListeners()
      // __toggleCaptions()
    }

    function __addMediaEventListeners () {
      if (__isMediaAvailable.value === true) {
        allEvents.forEach((event) => {
          $media.value.addEventListener(event, __mediaEventHandler)
        })
      }
    }

    function __removeMediaEventListeners () {
      if (__isMediaAvailable.value === true) {
        allEvents.forEach((event) => {
          $media.value.removeEventListener(event, __mediaEventHandler)
        })
      }
    }

    // function __addSourceEventListeners () {
    //   if (__isMediaAvailable.value === true) {
    //     const sources = $media.value.querySelectorAll('source')
    //     for (let index = 0; index < sources.length; ++index) {
    //       sources[ index ].addEventListener('error', __sourceEventHandler)
    //     }
    //   }
    // }

    // function __removeSourceEventListeners () {
    //   if (__isMediaAvailable.value === true) {
    //     const sources = $media.value.querySelectorAll('source')
    //     for (let index = 0; index < sources.length; ++index) {
    //       sources[ index ].removeEventListener('error', __sourceEventHandler)
    //     }
    //   }
    // }

    // function __sourceEventHandler (event) {
    //   const NETWORK_NO_SOURCE = 3
    //   if (__isMediaAvailable.value === true && $media.value.networkState === NETWORK_NO_SOURCE) {
    //     state.errorText = __isVideo.value ? '无法加载视频' : '无法加载音频'
    //     state.loading = false
    //   }
    //   // eslint-disable-next-line vue/custom-event-name-casing
    //   emit('networkState', event)
    // }

    function __mediaEventHandler (event) {
      if (event.type === 'abort') {
        emit('abort')
      }
      else if (event.type === 'canplay') {
        state.playReady = true
        state.displayTime = timeParse($media.value.currentTime)
        showControls()
        emit('ready')
      }
      else if (event.type === 'canplaythrough') {
        // console.log('canplaythrough')
        emit('canplaythrough')
      }
      else if (event.type === 'durationchange') {
        if (isFinite($media.value.duration)) {
          state.duration = $media.value.duration
          state.durationTime = timeParse($media.value.duration)
          emit('duration', $media.value.duration)
        }
      }
      else if (event.type === 'emptied') {
        emit('emptied')
      }
      else if (event.type === 'ended') {
        if (state.playMode === 1) {
          play()
        }
        else if (state.playMode === 2) {
          playNext()
        }
        else if (state.playMode === 3) {
          props.sources.length === 1 ? play() : playRound()
        }
        else if (state.playMode === 4) {
          props.sources.length === 1 ? play() : playRandom()
        }
        else {
          state.playing = false
        }
        emit('ended')
      }
      else if (event.type === 'error') {
        const error = $media.value.error
        state.errorText = error && error.message ? error.message : null
        state.playing = false
        state.loading = false
        emit('error', error)
      }
      else if (event.type === 'interruptbegin') {
        // console.log('interruptbegin')
      }
      else if (event.type === 'interruptend') {
        // console.log('interruptend')
      }
      else if (event.type === 'loadeddata') {
        state.loading = false
        emit('loadeddata')
      }
      else if (event.type === 'loadedmetadata') {
        // tracks can only be programatically added after 'loadedmetadata' event
        state.metadataLoaded = true
        // __updateTracks()
        // // set default track language
        // __updateTrackLanguage()
        // __toggleCaptions()
        emit('loadedmetadata')
      }
      else if (event.type === 'stalled') {
        emit('stalled')
      }
      else if (event.type === 'suspend') {
        emit('suspend')
      }
      else if (event.type === 'loadstart') {
        emit('loadstart')
      }
      else if (event.type === 'pause') {
        state.playing = false
        emit('paused')
      }
      else if (event.type === 'play') {
        emit('play')
      }
      else if (event.type === 'playing') {
        state.playing = true
        emit('playing')
      }
      else if (event.type === 'progress') {
        if ($media.value.buffered.length) {
          state.loadedTime = $media.value.buffered.end($media.value.buffered.length - 1)
        }
        else {
          state.loadedTime = 0
        }
      }
      else if (event.type === 'ratechange') {
        //
      }
      else if (event.type === 'seeked') {
        //
      }
      else if (event.type === 'timeupdate') {
        state.currentTime = $media.value.currentTime
        emit('timeupdate', $media.value.currentTime, state.remainingTime)
      }
      else if (event.type === 'volumechange') {
        //
      }
      else if (event.type === 'waiting') {
        emit('waiting')
      }
    }

    function __mergeClassOrStyle (type, val) {
      const child = {}
      if (val !== undefined) {
        if (typeof val === 'string') {
          if (type === 'style') {
            const parts = val.replace(/\s+/g, '').split(';')
            parts.forEach(part => {
              if (part !== '') {
                const data = part.split(':')
                child[ data[ 0 ] ] = data[ 1 ]
              }
            })
          }
          else if (type === 'class') {
            const parts = val.split(' ')
            parts.forEach(part => {
              if (part.replace(/\s+/g, '') !== '') {
                child[ part ] = true
              }
            })
          }
        }
        else {
          Object.assign(child, val)
        }
      }
      return child
    }

    // for future functionality
    // function __cueChanged (data) {
    // }

    function __checkCursor () {
      if (__isMediaAvailable.value === true) {
        if (state.inFullscreen && state.playing && !state.showControls) {
          $media.value.classList.remove('cursor-inherit')
          $media.value.classList.add('cursor-none')
        }
        else {
          $media.value.classList.remove('cursor-none')
          $media.value.classList.add('cursor-inherit')
        }
      }
    }

    // function __adjustMenu () {
    //   const qmenu = menu.value
    //   if (qmenu) {
    //     setTimeout(() => {
    //       qmenu.updatePosition()
    //     }, 350)
    //   }
    // }

    function __videoClick (e) {
      __stopAndPrevent(e)
      if (__isVideo.value) { // props.mobileMode !== true &&
        togglePlay()
      }
    }

    function __bigButtonClick (e) {
      __stopAndPrevent(e)
      // if (props.mobileMode) {
      //   hideControls()
      // }
      togglePlay()
    }

    // function __settingsMenuShowing (val) {
    //   settingsMenuVisible.value = val
    // }

    function __mouseLeaveVideo (e) {
      if (e.relatedTarget && e.relatedTarget.className === 'q-pa-md') {
        if (!props.bottomControls && !__isAudio.value && state.inControls !== true) { // && !props.mobileMode
          hideControls()
        }
      }
    }

    function __mouseMoveAction (e) {
      if (!props.bottomControls && !__isAudio.value) { // && !props.mobileMode
        __showControlsIfValid(e)
      }
    }

    function __getParentEl (el, className) {
      if (!el) return null
      if (String(el.className).startsWith(className)) {
        return el
      }
      return __getParentEl(el.offsetParent, className)
    }

    function __showControlsIfValid (e) {
      const pos = $media.value.getBoundingClientRect()
      const el = __getParentEl(e.target, 'q-media')
      if (!el) return
      const rect = el.getBoundingClientRect()
      if (!pos || !rect) return false
      if (rect.left === pos.left && rect.top === pos.top && rect.height === pos.height && rect.width === pos.width) {
        showControls()
        return true
      }

      return false
    }

    function __videoCurrentTimeChanged (val) {
      showControls()
      if (__isMediaAvailable.value === true && $media.value.duration && val && val > 0 && val <= state.duration) {
        if ($media.value.currentTime !== val) {
          state.currentTime = $media.value.currentTime = val
        }
      }
    }

    function __volumePercentChanged (val) {
      showControls()
      state.volume = val
    }

    // function __trackLanguageChanged (language) {
    //   if (state.trackLanguage !== language) {
    //     state.trackLanguage = language
    //   }
    // }

    function __playbackRateChanged (rate) {
      if (state.playbackRate !== rate) {
        state.playbackRate = rate
      }
    }

    // function __showingMenu () {
    //   return settingsMenuVisible.value
    // }

    function __updateBigPlayButton () {
      if (state.showBigPlayButton !== props.showBigPlayButton) {
        state.showBigPlayButton = props.showBigPlayButton
      }
    }

    function __updateVolume () {
      if (state.volume !== props.volume) {
        state.volume = props.volume
      }
    }

    function __updateMuted () {
      if (state.muted !== props.muted) {
        state.muted = props.muted
        if (__isMediaAvailable.value === true) {
          $media.value.muted = state.muted
        }
      }
    }

    // function __updateTrackLanguage () {
    //   if (state.trackLanguage !== '关闭') {
    //     state.trackLanguage = '关闭'
    //   }
    // }

    // function __updatePlaybackRates () {
    //   if (props.playbackRates && props.playbackRates.length > 0) {
    //     state.playbackRates = [ ...props.playbackRates ]
    //   }
    //   else {
    //     state.playbackRates.splice(0, state.playbackRates.length)
    //     state.playbackRates.push({ label: '0.5倍速', value: 0.5 })
    //     state.playbackRates.push({ label: '1倍速', value: 1 })
    //     state.playbackRates.push({ label: '1.5倍速', value: 1.5 })
    //     state.playbackRates.push({ label: '2倍速', value: 2 })
    //   }
    //   // state.trackLanguage = '关闭'
    // }

    function __updatePlaybackRate () {
      if (state.playbackRate !== props.playbackRate) {
        state.playbackRate = props.playbackRate
      }
    }

    function __updateSources () {
    //   __removeSources()
    //   __addSources()
    // }

      // // function __removeSources () {
      // //   if (__isMediaAvailable.value === true) {
      // //     __removeSourceEventListeners()
      // //     // player must not be running
      // //     $media.value.pause()
      // //     $media.value.src = ''
      // //     if ($media.value.currentTime) {
      // //       // otherwise IE11 has exception error
      // //       $media.value.currentTime = 0
      // //     }
      // //     const childNodes = $media.value.childNodes
      // //     for (let index = childNodes.length - 1; index >= 0; --index) {
      // //       if (childNodes[ index ].tagName === 'SOURCE') {
      // //         $media.value.removeChild(childNodes[ index ])
      // //       }
      // //     }
      // //     $media.value.load()
      // //   }
      // // }

      // function __addSources () {
      if (__isMediaAvailable.value === true) {
        // let loaded = false

        //   else {
        //   //   if (props.sources.length > 0) {
        //   //     props.sources.forEach((source) => {
        //   //       const s = document.createElement('SOURCE')
        //   //       s.src = source.src ? source.src : ''
        //   //       s.type = source.type ? source.type : ''
        //   //       $media.value.appendChild(s)
        //   //       if (!loaded && source.src) {
        //   //         $media.value.src = source.src
        //   //         loaded = true
        //   //       }
        //   //     })
        //   //   }
        //   // }

        // }

        if (props.sources.length > 0) {
          $media.value.src = props.sources[ props.pIndex ].src
          // $media.value.type = props.sources[ props.pIndex ].type
          // loaded = true
        }
        __reset()
        // __addSourceEventListeners()
        $media.value.load()
      }
    }

    // function __updateTracks () {
    //   __removeTracks()
    //   __addTracks()
    // }

    // function __removeTracks () {
    //   if (__isMediaAvailable.value === true) {
    //     const childNodes = $media.value.childNodes
    //     for (let index = childNodes.length - 1; index >= 0; --index) {
    //       if (childNodes[ index ].tagName === 'TRACK') {
    //         $media.value.removeChild(childNodes[ index ])
    //       }
    //     }
    //   }
    // }

    // function __addTracks () {
    //   // only add tracks to video
    //   if (__isVideo.value && __isMediaAvailable.value === true) {
    //     props.tracks.forEach((track) => {
    //       const t = document.createElement('TRACK')
    //       t.kind = track.kind ? track.kind : ''
    //       t.label = track.label ? track.label : ''
    //       t.src = track.src ? track.src : ''
    //       t.srclang = track.srclang ? track.srclang : ''
    //       $media.value.appendChild(t)
    //     })
    //     nextTick(() => {
    //       __toggleCaptions()
    //     })
    //   }
    // }

    function __updatePoster () {
      if (__isMediaAvailable.value === true && props.poster) {
        $media.value.poster = props.poster
      }
    }

    function __bigButtonPositionHeight () {
      if ($media.value) {
        // top of video
        return $media.value.clientTop
          // height of video / 2
          + ($media.value.clientHeight / 2).toFixed(2)
          // big button is 48px -- so 1/2 of that
          - 24 + 'px'
      }
      return '50%'
    }

    function __mouseEnterControls () {
      state.inControls = true
    }
    function __mouseLeaveControls () {
      state.inControls = false
    }

    // Rendering Methods

    function __renderVideo () {
      const slot = slots.oldbrowser

      const attrs = {
        poster: (props.poster ? props.poster : ''),
        preload: props.preload,
        playsinline: props.playsinline === true,
        loop: props.loop === true,
        autoplay: props.autoplay === true,
        muted: props.muted === true,
        width: props.contentWidth || undefined,
        height: props.contentHeight || undefined
      }

      // nextTick(() => {
      //   if (__isMediaAvailable.value && props.nativeControls === true) {
      //     $media.value.controls = true
      //   }
      // }).catch(e => console.error(e))

      return h('video', {
        ref: $media,
        class: {
          ...__renderVideoClasses.value,
          ...__mergeClassOrStyle('class', props.contentClass)
        },
        style: {
          ...__contentStyle.value
        },
        ...attrs
      }, hSlot(slot, h('p', '为播放此视频，请使用支持 HTML5 视频的浏览器。')))
    }

    function __renderAudio () {
      const slot = slots.oldbrowser

      const attrs = {
        // poster: (props.poster ? props.poster : ''),
        preload: props.preload,
        // playsinline: props.playsinline === true,
        loop: props.loop === true,
        autoplay: props.autoplay === true,
        muted: props.muted === true
        // width: props.contentWidth || undefined,
        // height: props.contentHeight || undefined
      }

      // nextTick(() => {
      //   if (__isMediaAvailable.value && props.nativeControls === true) {
      //     $media.value.controls = true
      //   }
      // }).catch(e => console.error(e))

      // This is on purpose (not using audio tag).
      // The video tag can also play audio and works better if dynamically
      // switching between video and audio on the same component.
      // That being said, if audio is truly needed, use the 'no-video'
      // property to force the <audio> tag.props.noVideo === true ? 'audio' : 'video'

      return h('audio', {
        ref: $media,
        class: {
          'q-media--player': true,
          ...__mergeClassOrStyle('class', props.contentClass)
        },
        style: props.contentStyle,
        ...attrs
      }, hSlot(slot, h('p', '为播放此音频，请使用支持 HTML5 音频的浏览器')))
    }

    // function __renderSources () {
    //   return props.sources.map((source) => {
    //     return h('source', {
    //       attrs: {
    //         key: source.src + ':' + source.type,
    //         src: source.src,
    //         type: source.type
    //       }
    //     })
    //   })
    // }

    // function __renderTracks () {
    //   return props.tracks.map((track) => {
    //     return h('track', {
    //       attrs: {
    //         key: track.src + ':' + track.kind,
    //         src: track.src,
    //         kind: track.kind,
    //         label: track.label,
    //         srclang: track.srclang
    //       }
    //     })
    //   })
    // }

    function __renderOverlayWindow () {
      if (slots.overlay) {
        return h('div', {
          class: 'q-media__overlay-window fit'
        }, slots.overlay())
      }
    }

    function errorWindowCloseButton () {
      return h(QBtn, {
        class: 'q-media__error-window--button',
        onClick: () => { state.errorText = null },
        icon: 'close',
        flat: true,
        size: 'sm'
      })
    }

    function __renderErrorWindow () {
      const slot = slots.errorWindow

      return h('div', {
        class: 'q-media__error-window'
      }, hSlot(slot, h('span', [ state.errorText, errorWindowCloseButton() ])))
    }

    function __renderTitle () {
      return h('div', {
        class: {
          'q-media__title': true,
          'q-media__controls--standard': !slots.controls && state.showControls, // || props.mobileMode && !props.dense)
          'q-media__controls--hidden': !state.showControls
        }
      }, props.sources[ props.pIndex ].title || '(*^__^*)')
    }

    function __renderPlayButton () {
      // if (props.hidePlayBtn === true) return

      // const slot = slots.play

      const properties = {
        icon: state.playing ? 'pause' : 'play',
        size: '1.5rem',
        disable: !state.playReady,
        flat: true,
        padding: '4px'
      }

      const events = {
        onClick: togglePlay
      }

      return h(QBtn, {
        class: 'q-media__controls--button play-button',
        ...properties,
        ...events
      })
      // , () => [
      //   props.showTooltips && state.playing && h(QTooltip, () => '暂停'),
      //   props.showTooltips && !state.playing && state.playReady && h(QTooltip, () => '播放')
      // ])
    }

    function __renderPlayNextButton () {
      if (props.sources.length < 2) return

      const properties = {
        icon: 'play-next',
        size: '1.5rem',
        disable: !state.playReady || (props.pIndex === props.sources.length - 1 && state.playMode < 3),
        flat: true,
        padding: '4px'
      }

      const events = {
        onClick: playNext
      }

      return h(QBtn, {
        class: 'q-media__controls--button play-button',
        ...properties,
        ...events
      })
    }

    function __renderPlayPrevButton () {
      if (props.sources.length < 2) return

      const properties = {
        icon: 'play-prev',
        size: '1.5rem',
        disable: !state.playReady || (props.pIndex === 0 && state.playMode < 3),
        flat: true,
        padding: '4px'
      }

      const events = {
        onClick: playPrev
      }

      return h(QBtn, {
        class: 'q-media__controls--button play-button',
        ...properties,
        ...events
      })
    }

    function playPrev () {
      if (props.pIndex > 0) {
        props.pIndex--
      }
    }

    function playNext () {
      if (props.pIndex < props.sources.length - 1) {
        props.pIndex++
      }
    }

    function playRound () {
      if (props.pIndex === props.sources.length - 1) {
        props.pIndex = (props.pIndex === props.sources.length - 1 ? 0 : props.pIndex++)
      }
    }

    function playRandom () {
      const i = props.sources.length
      const r = Math.floor(Math.random() * i / 2)
      let p = props.pIndex
      p += (r > 0 ? r : 1)
      props.pIndex = p > i - 1 ? p - i : p
    }

    function __renderPlayModeButton () {
      const properties = {
        icon: [ 'danqu', 'xunhuan1', 'liebiao1', 'xunhuan', 'suiji' ][ state.playMode ],
        size: '1.5rem',
        disable: !state.playReady,
        flat: true,
        padding: '4px'
      }

      const events = {
        onClick: togglePlayMode
      }

      return h(QBtn, {
        class: 'q-media__controls--button play-button',
        ...properties,
        ...events
      }, () => h(QTooltip, () => [ '单曲播放', '单曲循环播放', '列表顺序播放', '列表循环播放', '随机播放' ][ state.playMode ])
      )
    }

    function togglePlayMode () {
      state.playMode < 4 ? state.playMode++ : state.playMode = 0
    }

    function __renderVolumeButton () {
      if (props.hideVolumeBtn === true) {
        return
      }

      const properties = {
        icon: __volumeIcon.value,
        size: '1.5rem',
        disable: !state.playReady,
        flat: true,
        padding: '4px'
      }

      return h(QBtn, {
        class: 'q-media__controls--button',
        ...properties
      }, () => [
        // props.showTooltips === true && !settingsMenuVisible.value
        //   ? h(QTooltip, () => '设置')
        //   : undefined,
        __renderVolumeChangeMenu()
      ])
    }

    function __renderVolumeChangeMenu () {
      const properties = {
        anchor: 'top middle',
        self: 'bottom middle'
      }

      return h(QMenu, {
        ref: menu,
        style: 'width:200px;height:50px;',
        class: 'column justify-center bg-blue-10',
        ...properties
      }, () => [ h(QItem, {}
        , () => [
          h(QItemSection, { side: true }, () => [ __renderVolumeChangeButton() ]),
          h(QItemSection, {}, () => [ __renderVolumeSlider() ])
        ]) ]
      )
    }

    function __renderVolumeChangeButton () {
      const properties = {
        icon: __volumeIcon.value,
        size: '1.5rem',
        padding: '4px',
        flat: true,
        color: 'white',
        round: true
      }

      const events = {
        onClick: toggleMuted
      }

      return h(QBtn, {
        ...properties,
        ...events
      })
      // , () => [
      //   props.showTooltips === true
      //     ? state.muted === true
      //       ? h(QTooltip, () => '取消静音')
      //       : h(QTooltip, () => '静音')
      //     : undefined
      // ])
    }

    function __renderVolumeSlider () {
      // if (props.hideVolumeSlider === true || props.hideVolumeBtn === true) {
      //   return
      // }

      const properties = {
        modelValue: state.volume,
        dark: props.dark,
        min: 0,
        max: 100,
        trackColor: 'white',
        disable: !state.playReady || state.muted
        // color: 'white'
      }

      const events = {
        onChange: __volumePercentChanged
      }

      return h(QSlider, {
        ...properties,
        ...events
      })
    }

    function __renderRatesButton () {
      // if (props.hideSettingsBtn === true) {
      //   return
      // }

      const properties = {
        // icon: 'setting',
        label: state.playbackRate + 'X',
        // size: '1.2rem',
        disable: !state.playReady,
        flat: true,
        padding: '4px'
      }

      return (h(QBtn, {
        class: 'q-media__controls--button settings-button',
        ...properties
      }, () => [
        // props.showTooltips === true && !settingsMenuVisible.value
        //   ? h(QTooltip, () => '设置')
        //   : undefined,
        __renderRatesMenu()
      ]))
    }

    function __renderRatesMenu () {
      const properties = {
        anchor: 'top middle',
        self: 'bottom middle'
      }

      // const events = {
      //   onShow: () => {
      //     __settingsMenuShowing(true)
      //   },
      //   onHide: () => {
      //     __settingsMenuShowing(false)
      //   }
      // }

      return h(QMenu, {
        ref: menu,
        class: 'bg-blue-10 text-white',
        ...properties
        // ...events
      }, () => [
        h('div', [
          h(QList, {
            // props
            highlight: true
          }, () => [
            state.playbackRates.map(rate => {
              return withDirectives(h(QItem, {
                // attrs
                key: rate.value,
                // props
                clickable: true,
                dense: true,
                // events
                onClick: (e) => {
                  __stopAndPrevent(e)
                  __playbackRateChanged(rate.value)
                }
              }, () => [
                h(QItemSection, {
                  // props
                  avatar: true
                }, () => [
                  rate.value === state.playbackRate && h(QIcon, {
                    // props
                    name: 'check'
                  })
                ]),
                h(QItemSection, () => rate.label)
              ]), [ [
                ClosePopup
              ] ])
            })
          ])
        ])
      ])
    }

    function __renderListButton () {
      const properties = {
        icon: 'playlist',
        size: '1.5rem',
        disable: !state.playReady,
        flat: true,
        padding: '4px'
      }

      return (h(QBtn, {
        class: 'q-media__controls--button settings-button',
        ...properties
      }, () => [
        __renderListMenu()
      ]))
    }

    function __renderListMenu () {
      const properties = {
        anchor: 'top middle',
        self: 'bottom middle'
      }

      // const events = {
      //   onShow: () => {
      //     __settingsMenuShowing(true)
      //   },
      //   onHide: () => {
      //     __settingsMenuShowing(false)
      //   }
      // }

      return h(QMenu, {
        ref: menu,
        style: 'width:200px;padding-bottom: 20px;',
        class: 'bg-blue-10 text-white',
        ...properties
        // ...events
      }, () => [
        h('div', [
          h(QList, {
            // props
            bordered: true,
            separator: true,
            highlight: true
          }, () => [
            h(QInput, {
              type: 'file',
              outlined: true,
              color: 'green',
              modelValue: blob.value,
              'onUpdate:modelValue': (val) => { blob.value = val; loadFileBlob(val) }
            }),
            props.sources.map((source, index, sources) => {
              return h(QItem, {
                // attrs
                // props
                active: index === props.pIndex,
                clickable: true,

                // events
                onClick: (e) => {
                  __stopAndPrevent(e)
                  props.pIndex = index
                  // __playbackRateChanged(source.value)
                }
              }, () => [
                h(QItemSection, { side: true }, () => index + 1),
                h(QItemSection, () => source.title || '(*^__^*)')
              ])
            })
          ])
        ])
      ])
    }

    function __renderFullscreenButton () {
      const properties = {
        icon: state.inFullscreen ? 'fullscreen-exit' : 'fullscreen',
        size: '1.5rem',
        disable: !state.playReady,
        flat: true,
        padding: '4px'
      }

      const events = {
        onClick: toggleFullscreen
      }

      return h(QBtn, {
        class: 'q-media__controls--button fullscreen-button',
        ...properties,
        ...events
      })
      // , () => [
      //   props.showTooltips === true
      //     ? h(QTooltip, () => '切换全屏')
      //     : undefined
      // ])
    }

    function __renderLoader () {
      if (props.spinnerSize === void 0) {
        if (__isVideo.value) state.spinnerSize = '3em'
        else state.spinnerSize = '1.5em'
      }
      else {
        state.spinnerSize = props.spinnerSize
      }

      // const slot = slots.spinner

      return h('div', {
        class: __isVideo.value ? 'q-media__loading--video' : 'q-media__loading--audio'
      }, [
        h(QSpinner, {
          size: state.spinnerSize
        })
      ])
    }

    function __renderBigPlayButton () {
      // const slot = slots.bigPlayButton

      const events = {
        onClick: __bigButtonClick
      }

      return h('div', {
        class: {
          'q-media--big-button q-media--big-button-bottom-controls': state.bottomControls === true,
          'q-media--big-button': state.bottomControls !== true
        },
        style: {
          top: __bigButtonPositionHeight()
        }
      }, [
        h(QIcon, {
          name: 'play',
          class: 'q-media--big-button-icon',
          ...events
        })
      ])
    }

    function __renderCurrentTimeSlider () {
      const properties = {
        modelValue: state.currentTime,
        dark: props.dark,
        min: 0,
        max: state.duration ? state.duration : 1,
        inner: state.loadedTime,
        trackSize: '2px',
        innerTrackColor: 'red',
        disable: !state.playReady || props.disabledSeek
      }

      const events = {
        onChange: __videoCurrentTimeChanged
      }

      return h(QSlider, {
        class: 'col',
        style: {
          margin: '3px 0',
          color: props.dark === true || $q.dark.isActive ? 'var(--mplayer-color-dark)' : 'var(--mplayer-color)'
        },
        ...properties,
        ...events
      })
    }

    function __renderDisplayTime () {
      // const slot = slots.displayTime

      return h('span', {
        class: 'q-media__controls--video-time-text text-left',
        style: {
          color: props.dark === true || $q.dark.isActive ? 'var(--mplayer-color-dark)' : 'var(--mplayer-color)'
        }
      }, state.displayTime)
    }

    function __renderDurationTime () {
      if (__isMediaAvailable.value !== true) return

      // const slot = slots.durationTime
      const isInfinity = !isFinite($media.value.duration)

      return h('span', {
        class: 'q-media__controls--video-time-text text-right',
        style: {
          width: isInfinity ? '30px' : 'auto',
          color: props.dark === true || $q.dark.isActive ? 'var(--mplayer-color-dark)' : 'var(--mplayer-color)'
        }
      }, [
        __isMediaAvailable.value === true && isInfinity !== true && state.durationTime,
        __isMediaAvailable.value === true && isInfinity === true && __renderInfinitySvg()
      ])
    }

    function __renderInfinitySvg () {
      return h('svg', {
        height: '16',
        viewbox: '0 0 16 16'
      }, [
        h('path', {
          fill: 'none',
          color: props.dark === true || $q.dark.isActive ? 'var(--mplayer-color-dark)' : 'var(--mplayer-color)',
          strokeWidth: '2',
          d: 'M8,8 C16,0 16,16 8,8 C0,0 0,16 8,8z'
        })
      ])
    }

    // function __renderSettingsMenu () {
    //   const slot = slots.settingsMenu

    //   const properties = {
    //     anchor: 'top right',
    //     self: 'bottom right'
    //   }

    //   // const events = {
    //   //   onShow: () => {
    //   //     __settingsMenuShowing(true)
    //   //   },
    //   //   onHide: () => {
    //   //     __settingsMenuShowing(false)
    //   //   }
    //   // }

    //   return h(QMenu, {
    //     ref: menu,
    //     ...properties
    //     // ...events
    //   }, () => [
    //     (slot && slot()) || h('div', [
    //       state.playbackRates.length > 0 && h(QExpansionItem, {
    //         // props
    //         group: 'settings-menu',
    //         expandSeparator: true,
    //         icon: 'speed',
    //         label: '播放速率',
    //         caption: __settingsPlaybackCaption.value,
    //         // events
    //         onShow: __adjustMenu,
    //         onHide: __adjustMenu
    //       }, () => [
    //         h(QList, {
    //           // props
    //           highlight: true
    //         }, () => [
    //           state.playbackRates.map(rate => {
    //             return withDirectives(h(QItem, {
    //               // attrs
    //               key: rate.value,
    //               // props
    //               clickable: true,
    //               dense: true,
    //               // events
    //               onClick: (e) => {
    //                 __stopAndPrevent(e)
    //                 __playbackRateChanged(rate.value)
    //               }
    //             }, () => [
    //               h(QItemSection, {
    //                 // props
    //                 avatar: true
    //               }, () => [
    //                 rate.value === state.playbackRate && h(QIcon, {
    //                   // props
    //                   name: 'selected'
    //                 })
    //               ]),
    //               h(QItemSection, () => rate.label)
    //             ]), [ [
    //               ClosePopup
    //             ] ])
    //           })
    //         ])
    //       ])
    //       // first item is 'Off' and doesn't count unless more are added
    //       // __selectTracksLanguageList.value.length > 1 && h(QExpansionItem, {
    //       //   // props
    //       //   group: 'settings-menu',
    //       //   expandSeparator: true,
    //       //   icon: 'language',
    //       //   label: '语言',
    //       //   caption: state.trackLanguage,
    //       //   // events
    //       //   onShow: __adjustMenu,
    //       //   onHide: __adjustMenu
    //       // }, () => [
    //       //   h(QList, {
    //       //     // props
    //       //     highlight: true
    //       //   }, () => [
    //       //     __selectTracksLanguageList.value.map(language => {
    //       //       return withDirectives(h(QItem, {
    //       //         // attrs
    //       //         key: language.value,
    //       //         // props
    //       //         clickable: true,
    //       //         dense: true,
    //       //         // events
    //       //         onClick: (e) => {
    //       //           __stopAndPrevent(e)
    //       //           __trackLanguageChanged(language.value)
    //       //         }
    //       //       }, () => [
    //       //         h(QItemSection, {
    //       //           // props
    //       //           avatar: true
    //       //         }, () => [
    //       //           language.value === state.trackLanguage
    //       //           && h(QIcon, {
    //       //             // props
    //       //             name: 'selected'
    //       //           })
    //       //         ]),
    //       //         h(QItemSection, () => language.label)
    //       //       ]), [ [
    //       //         ClosePopup
    //       //       ] ])
    //       //     })
    //       //   ])
    //       // ])
    //     ])
    //   ])
    // }

    function __renderVideoControls () {
      const slot = slots.controls

      const events = {
        onClick: __stopAndPrevent,
        onMouseenter: __mouseEnterControls,
        onMouseleave: __mouseLeaveControls
      }

      if (slot) {
        // we need to know the controls height for fullscreen, stop propagation to video component
        return h('div', {
          ref: controls,
          class: {
            'q-media__controls': true,
            'q-media__controls--overlay': __isVideo.value === true && state.bottomControls !== true,
            ...__videoControlsClasses.value
          },
          ...events
        },
        slot()
        )
      }

      return h('div', {
        ref: controls,
        class: {
          'q-media__controls': true,
          'q-media__controls--overlay': __isVideo.value === true && state.bottomControls !== true,
          ...__videoControlsClasses.value
        },
        ...events
      }, [
        // dense
        // props.dense && h('div', {
        //   class: 'q-media__controls--row row col content-start items-center'
        // }, [
        //   h('div', [
        //     __renderPlayButton(),
        //     __renderPlayPrevButton(),
        //     __renderPlayNextButton(),
        //     props.showTooltips && !state.playReady && h(QTooltip, () => '等待视频中')
        //   ]),
        //   // __renderVolumeSlider(),
        //   __renderDisplayTime(),
        //   __renderCurrentTimeSlider(),
        //   __renderDurationTime(),
        //   __renderPlayModeButton(), __renderRatesButton(), __renderVolumeButton(), __renderListButton(),
        //   $q.fullscreen !== void 0 && props.hideFullscreenBtn !== true && __renderFullscreenButton()
        // ]),
        // sparse
        // !props.dense &&
        h('div', {
          class: 'q-media__controls--row row col items-center justify-between'
        }, [
          __renderDisplayTime(),
          __renderCurrentTimeSlider(),
          __renderDurationTime()
        ]),
        // !props.dense &&
        h('div', {
          class: 'q-media__controls--row row col content-start items-center'
        }, [
          h('div', {
            class: 'row col'
          }, [
            h('div', [
              __renderPlayButton(),
              __renderPlayPrevButton(),
              __renderPlayNextButton(),
              props.showTooltips && !state.playReady && h(QTooltip, () => '等待视频中')
            ])
            // __renderVolumeSlider()
          ]),
          h('div', [
            __renderPlayModeButton(), __renderRatesButton(), __renderVolumeButton(), __renderListButton(),
            $q.fullscreen !== void 0 && __renderFullscreenButton()
          ])
        ])
      ])
    }

    function __renderAudioControls () {
      const slot = slots.controls

      return (slot && slot()) || h('div', {
        ref: controls,
        class: {
          'q-media__controls': true,
          ...__audioControlsClasses.value
        }
      }, [
        // props.dense && h('div', {
        //   class: 'q-media__controls--row row col content-start items-center'
        // }, [
        //   // dense
        //   h('div', [
        //     __renderPlayButton(),
        //     props.showTooltips && !state.playReady && h(QTooltip, () => '等待音频中')
        //   ]),
        //   __renderVolumeButton(),
        //   // __renderVolumeSlider(),
        //   __renderDisplayTime(),
        //   __renderCurrentTimeSlider(),
        //   __renderDurationTime()
        // ]),
        // sparse
        h('div', {
          class: 'row col items-center justify-between'
        }, [
          __renderDisplayTime(),
          __renderCurrentTimeSlider(),
          __renderDurationTime()
        ]),
        h('div', {
          class: 'row col content-start items-center'
        }, [
          h('div', [
            __renderPlayButton(),
            __renderPlayPrevButton(),
            __renderPlayNextButton(),
            props.showTooltips && !state.playReady && h(QTooltip, () => '等待音频中')
          ]),
          h('div', [
            __renderPlayModeButton(), __renderRatesButton(), __renderVolumeButton(), __renderListButton()
          ])
          // __renderVolumeSlider()
        ])
      ])
    }

    function __rendermPlayer () {
      const events = {
        onMousemove: __mouseMoveAction,
        onMouseleave: __mouseLeaveVideo,
        onClick: __videoClick
      }

      return h('div', {
        class: {
          'q-media--dark': props.dark === true,
          'q-media': true,
          ...__classes.value
        },
        style: {
          borderRadius: !state.inFullscreen ? props.radius : 0,
          margin: '6px auto'
          // height: __isVideo.value ? 'auto' : props.dense ? '40px' : '80px'
        },
        ...events
      }, canRender.value === true
        ? [
            __isVideo.value && __renderVideo(),
            __isAudio.value && __renderAudio(),
            __renderOverlayWindow(),
            __renderTitle(),
            state.errorText && __renderErrorWindow(),
            __isVideo.value && !state.noControls && !state.errorText && __renderVideoControls(),
            __isAudio.value && !state.noControls && !state.errorText && __renderAudioControls(),
            props.showSpinner === true && state.loading && !state.playReady && !state.errorText && __renderLoader(),
            __isVideo.value && props.showBigPlayButton && state.playReady && !state.playing && __renderBigPlayButton()
          ]
        : void 0)
    }

    // expose public methods
    expose({
      loadFileBlob,
      showControls,
      hideControls,
      toggleControls,
      play,
      pause,
      mute,
      unmute,
      togglePlay,
      toggleMuted,
      toggleFullscreen,
      setFullscreen,
      exitFullscreen,
      currentTime,
      setCurrentTime,
      setVolume,
      $media
    })

    return () => __rendermPlayer()
  }
})
