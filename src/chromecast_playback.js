import {Events, Log, Playback, template} from 'Clappr'
import chromecastHTML from './public/chromecast.html'

var TICK_INTERVAL = 100

export default class ChromecastPlayback extends Playback {

  get name() { return 'chromecast_playback' }
  get template() { return template(chromecastHTML) }
  get attributes() { return { class: 'chromecast-playback' } }

  constructor(options) {
    super(options)
    this.options = options
    this.src = options.src
    this.currentMedia = options.currentMedia
    this.mediaControl = options.mediaControl
    this.currentMedia.addUpdateListener(() => this.onMediaStatusUpdate())
  }

  render() {
    var template = this.template()
    this.$el.html(template)
    if (this.options.poster) {
      this.$el.find('.chromecast-playback-background').css('background-image', 'url(' + this.options.poster + ')')
    } else {
      this.$el.find('.chromecast-playback-background').css('background-color', '#666')
    }
  }

  play() {
    this.currentMedia.play()
  }

  pause() {
    this.stopTimer()
    this.currentMedia.pause()
  }

  stop() {
    this.stopTimer()
    this.currentMedia.stop()
  }

  seek(time) {
    this.stopTimer()
    var request = new chrome.cast.media.SeekRequest()
    request.currentTime = time
    this.currentMedia.seek(request,
      () => this.startTimer(), () => Log.warn('seek failed'))
  }

  startTimer() {
    this.timer = setInterval(() => this.updateMediaControl(), TICK_INTERVAL)
  }

  stopTimer() {
    clearInterval(this.timer)
    this.timer = null
  }

  getDuration() {
    return this.currentMedia.media.duration
  }

  isPlaying() {
    return this.currentMedia.playerState === 'PLAYING' || this.currentMedia.playerState === 'BUFFERING'
  }

  onMediaStatusUpdate() {
    this.mediaControl.changeTogglePlay()
    if (this.isPlaying() && !this.timer) {
      this.startTimer()
    }

    if (this.currentMedia.playerState === 'BUFFERING') {
      this.isBuffering = true
      this.trigger(Events.PLAYBACK_BUFFERING, this.name)
    } else if (this.currentMedia.playerState === 'PLAYING') {
      if (this.isBuffering) {
        this.isBuffering = false
        this.trigger(Events.PLAYBACK_BUFFERFULL, this.name)
      }
      this.trigger(Events.PLAYBACK_PLAY, this.name)
    } else if (this.currentMedia.playerState === 'IDLE') {
      if (this.isBuffering) {
        this.isBuffering = false
        this.trigger(Events.PLAYBACK_BUFFERFULL, this.name)
      }
      this.trigger(Events.PLAYBACK_ENDED, this.name)
    }
  }

  updateMediaControl() {
    var position = this.currentMedia.getEstimatedTime()
    var duration = this.currentMedia.media.duration
    this.trigger(Events.PLAYBACK_TIMEUPDATE, {current: position, total: duration}, this.name)
  }

  show() {
    this.$el.show()
  }

  hide() {
    this.$el.hide()
  }
}
