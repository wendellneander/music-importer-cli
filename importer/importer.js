const ytdl = require('ytdl-core')
const ffmpeg = require('fluent-ffmpeg')
const ffmetadata = require("ffmetadata")
const fs = require('fs')
const SpotifyClient =  require('./clients/spotify')
const YoutubeClient =  require('./clients/youtube')
const Playlist = require('./models/Playlist')
const Track = require('./models/Track')

class Importer {
  static get SOURCE_SPOTIFY() {
    return 'spotify'
  }
  static get SOURCE_YT() {
    return 'youtube'
  }

  constructor(params) {
    this.spotifyAccessToken = params.spotifyAccessToken
    this.youtubeApiKey = params.youtubeApiKey
    this.playlistSource = params.playlistSource
    this.playlistUrl = params.playlistUrl
    this.playlistId = params.playlistId
    this.folderPath = params.folderPath
    this.folderTitle = params.usePlaylistTitleAsFolderTitle
    this.usePlaylistTitleAsFolderTitle = params.usePlaylistTitleAsFolderTitle
    this.audioBitrate = params.audioBitrate
    this.playlist = null

    this._log = params.log
    this._downloads = []
    this._trackList = []
    this._folderTitle = ''
  }

  /**
   * Start here
   * @return {Promise<void>}
   */
  async run() {
    try {
      this.__log('Buscando playlist...')

      let playlist
      if (this.playlistSource === Importer.SOURCE_SPOTIFY) {
        playlist = await this.loadPlaylistFromSpotify(this.playlistId)
      } else {
        playlist = await this.loadPlaylistFromYT(this.playlistId)
      }
      this.playlist = playlist
      this.__log('Playlist encontrada: ' + playlist.title)
      this.__log('Baixando tracks...')
      this._folderTitle = this.usePlaylistTitleAsFolderTitle ? playlist.title : this.folderTitle
      this._trackList = [...playlist.tracks]
      await this.__downloadNextTrack()
    } catch (e) {
      console.error(e.stack)
    }
  }

  /**
   * Load all music in playlist from Spotify
   * Load artwork, title, author, etc.
   * Create a playlist of music objects with all the information from a track
   *
   * @param {string} playlistId
   * @return {Playlist}
   */
  async loadPlaylistFromSpotify(playlistId) {
    const spotifyClient = new SpotifyClient(this.spotifyAccessToken)
    const spotifyPlaylist = await spotifyClient.getPlaylist(playlistId)
    //const spotifyTracks = await spotifyClient.getPlaylistTracks(playlistId)

    const tracks = []
    spotifyPlaylist.body.tracks?.items?.forEach(trackItem => {
      const t = new Track({
        id: trackItem.track.id,
        title: trackItem.track.name,
        artists: trackItem.track.artists?.map(artist => artist.name),
        artwork: trackItem.track.album?.images.find(i => i.height === 300)?.url,
        album: trackItem.track.album?.name,
        duration: trackItem.track.duration_ms,
        titleWithArtists: `${trackItem.track.name} - ${trackItem.track.artists?.map(artist => artist.name).join(', ')}`
      })
      tracks.push(t)
    })

    return new Playlist({
      id: spotifyPlaylist.body.id,
      title: spotifyPlaylist.body.name,
      author: spotifyPlaylist.body.owner?.display_name,
      artwork: spotifyPlaylist.body.images[0]?.url,
      tracks
    })
  }

  /**
   *
   * @param {string} playlistId
   * @return {Playlist}
   */
  async loadPlaylistFromYT(playlistId) {
  }

  /**
   * Get the video id on YouTube
   * @param track
   * @return {Promise<string>}
   */
  async getVideoIdFromYouTube(track) {
    const youtubeClient = new YoutubeClient(this.youtubeApiKey)
    const result = await youtubeClient.search(track.titleWithArtists)
    return result.body.items?.filter(item => item.id.kind === 'youtube#video')[0].id.videoId
  }

  /**
   * Download music from a data source (currently YouTube)
   * @param track
   */
  downloadAudioFromDataSource(track) {
    this._downloads.push(track)
    const downloadIndex = this._downloads.length
    this.__log(`${downloadIndex} - ${track.titleWithArtists}: Download iniciado`)

    const stream = ytdl(track.youtubeUrl, {quality: 'highestaudio', filter: 'audioonly'})
    ffmpeg(stream)
      .audioBitrate(this.audioBitrate)
      .save(track.filePath)
      //.on('progress', p => console.log(`${fileName} - ${p.targetSize}kb downloaded`))
      .on('end', async () => {
        this.__log(`${downloadIndex} - ${track.titleWithArtists}: Download concluido`)
        await this.__saveMetadata(track)
        const next = await this.__downloadNextTrack()
        if (next === false) {
          this.__onAllDownloadsFinish()
        }
      })

  }

  /**
   * Receive an array of musics and try to find a YouTube url that corresponds to the music
   * Save the url for each item e return it
   * @param {Playlist} playlist
   * @return {Playlist}
   * @private
   */
  async __setUrlsFromDataSource(playlist) {
    const youtubeClient = new YoutubeClient(this.youtubeApiKey)

    for (const track of playlist.tracks) {
      const result = await youtubeClient.search(track.titleWithArtists)
      track.youtubeId = result.body.items?.filter(item => item.id.kind === 'youtube#video')[0].id.videoId
    }

    return playlist
  }

  /**
   * Get the next trakc on the queue to download
   *
   * @private
   */
  async __downloadNextTrack() {
    const track = this._trackList.pop()
    if (!track) return false

    const videoId = await this.getVideoIdFromYouTube(track)
    const trackIndex = this.playlist.tracks.findIndex(t => t.id === track.id)
    const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`
    const directoryPath = this.__createDirectory(this._folderTitle)
    const filePath = `${directoryPath}/${track.titleWithArtists}.mp3`
    const fileName = `${track.titleWithArtists}.mp3`
    track.youtubeUrl = youtubeUrl
    track.filePath = filePath
    track.fileName = fileName
    track.directoryPath = directoryPath
    this.playlist.tracks[trackIndex] = track

    this.downloadAudioFromDataSource(track)
  }

  /**
   * Save metatada into a file
   * @param track
   * @private
   */
  __saveMetadata(track) {
    const metadata = {
      artist: track.artists.join(', '),
      album: track.album,
      title: track.titleWithArtists,
    }
    const options = {
      attachments: [track.artwork],
    }

    return ffmetadata.write(track.filePath, metadata, options, function(err) {
      if (err) {
        console.error("Error writing metadata");
      }
      else {
        console.log(`${track.titleWithArtists} - Metadata saved.`);
      }
    })
  }

  /**
   * Log a message
   * @param msg
   * @private
   */
  __log(msg) {
    if (this._log) {
      console.log(msg)
    }
  }

  /**
   * Export playlist data to a JSON File
   * @private
   */
  __savePlaylistAsAJSONFile(){
    // Save the playlist as local file
    fs.writeFile(`${__dirname}/playlists/${this.playlist.title}.json`, JSON.stringify(this.playlist), (err, data) => {
      if (err) {
        this.__log('Erro ao salvar playlist localmente')
      } else {
        this.__log('Playlist salva localmente')
      }
    })
  }

  /**
   * Create a directory if not exists
   * @param folder
   * @return {string}
   * @private
   */
  __createDirectory(folder) {
    // Create directory if not exists
    const directory = `${__dirname}/downloads/${folder}`
    if (!fs.existsSync(directory)){
      fs.mkdirSync(directory, { recursive: true })
    }
    return directory
  }

  /**
   * Called when all downloads are finished
   *
   * @private
   */
  __onAllDownloadsFinish() {
    this.__savePlaylistAsAJSONFile()
    this.__log('Importação concluída.')
  }
}

module.exports = Importer
