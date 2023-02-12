import ytdl from 'ytdl-core'
import ffmpeg from 'fluent-ffmpeg'
import ffmetadata from 'ffmetadata'
import fs from 'fs'
import axios from 'axios'
import SpotifyClient from './clients/spotify.js'
import YoutubeClient from './clients/youtube.js'
import Playlist from './models/Playlist.js'
import Track from './models/Track.js'


export default class Importer {
  static SOURCE_SPOTIFY = 'spotify'
  static SOURCE_YT = 'youtube'

  constructor(params) {
    this.youtubeApiKey = params.youtubeApiKey
    this.playlistSource = params.playlistSource
    this.playlistUrl = params.playlistUrl
    this.playlistId = params.playlistId
    this.folderPath = params.folderPath
    this.folderTitle = params.folderTitle
    this.usePlaylistTitleAsFolderTitle = params.usePlaylistTitleAsFolderTitle
    this.audioBitrate = params.audioBitrate
    this.playlist = null

    this._log = params.log
    this._downloads = []
    this._trackList = []
    this._folderTitle = ''
  }

  /**
   * @returns {Promise<void>}
   */
  async run() {
    this.__log('Buscando playlist...')
    this.playlist = await this.__loadPlaylistFromSource()
    this.__log('Playlist encontrada: ' + this.playlist.title)
    this.__log('Baixando tracks...')
    this._folderTitle = this.usePlaylistTitleAsFolderTitle ? this.playlist.title : this.folderTitle
    this._trackList = [...this.playlist.tracks]
    await this.__downloadNextTrack()
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
    const spotifyAccessToken = await this.__getSpotifyAccessToken()
    const spotifyClient = new SpotifyClient(spotifyAccessToken)
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
    // TODO: priorizar o download de musicas versao extended > original > qualquer uma
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
    this.__log(`Caminho do arquivo: ${track.filePath}`)
    if(!fs.existsSync(track.filePath)) {
      fs.writeFileSync(track.filePath)
    }

    try {
      const stream = ytdl(track.youtubeUrl, {quality: 'highestaudio', filter: 'audioonly'})
      ffmpeg(stream)
        .audioBitrate(this.audioBitrate)
        .save(track.filePath)
        .on('end', async () => {
          this.__log(`${downloadIndex} - ${track.titleWithArtists}: Download concluido`)
          await this.__saveMetadata(track)
          await this.__downloadNextTrack()
        })
    } catch (e) {
      this.__log(`${downloadIndex} - ${track.titleWithArtists}: Download com falha (${e.message})`)
      this.__downloadNextTrack()
    }
  }

  /**
   * Save metadata into a file
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
        console.error("Error writing metadata")
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
    fs.writeFile(`${this.folderPath}/${this._folderTitle}/${this._folderTitle}.json`, JSON.stringify(this.playlist), (err) => {
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
    const directory = `${this.folderPath}/${folder}`
    if (!fs.existsSync(directory)){
      fs.mkdirSync(directory, { recursive: true })
    }
    return directory
  }

  /**
   * @param path
   * @returns {boolean}
   * @private
   */
  __fileExists(path) {
    return fs.existsSync(path)
  }

  /**
   * Called when all downloads are finished
   * @private
   */
  __onAllDownloadsFinish() {
    this.__savePlaylistAsAJSONFile()
    this.__log('Importação concluída.')
  }

  /**
   * @return {Promise<Playlist>}
   * @private
   */
  async __loadPlaylistFromSource() {
    if (this.playlistSource === Importer.SOURCE_SPOTIFY) {
      return await this.loadPlaylistFromSpotify(this.playlistId)
    }
    return await this.loadPlaylistFromYT(this.playlistId)
  }

  /**
   * Get the next track on the queue to download
   * @private
   */
  async __downloadNextTrack() {
    const track = this._trackList.pop()
    if (!track) {
      this.__onAllDownloadsFinish()
      return false
    }

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

    if (!this.__fileExists(filePath)) {
      this.downloadAudioFromDataSource(track)
    } else {
      this.__log(`Skipped - ${fileName}`)
      await this.__downloadNextTrack()
    }
    return track
  }

  /**
   * @returns {Promise<*>}
   */
  async __getSpotifyAccessToken() {
    const clientId = process.env.SPOTIFY_CLIENT_ID
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET
    const payload = { grant_type: 'client_credentials' }
    const config = {
      headers: {
        'Authorization': 'Basic ' + (Buffer.from(clientId + ':' + clientSecret).toString('base64')),
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    }
    const response = await axios.post('https://accounts.spotify.com/api/token',  payload, config)
    return response.data.access_token
  }
}
