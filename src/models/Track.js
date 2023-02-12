export default class Track {
  constructor({ id, title, artists, artwork, album, duration, youtubeId, youtubeUrl, titleWithArtists, filePath, fileName }) {
    this.id = id
    this.title = title
    this.artists = artists
    this.album = album
    this.artwork = artwork
    this.duration = duration
    this.youtubeId = youtubeId
    this.youtubeUrl = youtubeUrl
    this.titleWithArtists = titleWithArtists
    this.filePath = filePath
    this.fileName = fileName
  }
}
