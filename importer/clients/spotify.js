const superagent = require('superagent')

class SpotifyClient {
  constructor(accessToken) {
    this.API_URL = 'https://api.spotify.com/v1'
    this.accessToken = accessToken
    this.headerAccessToken = `Bearer ${accessToken}`
  }

  /**
   *
   * @param {string} playlistId
   * @return {Promise<void>}
   */
  async getPlaylist(playlistId) {
    const playlistUrl = `${this.API_URL}/playlists/${playlistId}`
    return await superagent
      .get(playlistUrl)
      .set('Authorization', this.headerAccessToken)
  }

  /**
   *
   * @param {string} playlistId
   * @param limit
   * @param offset
   * @return {Promise<void>}
   */
  async getPlaylistTracks(playlistId, limit, offset) {
    const playlistUrl = `${this.API_URL}/playlists/${playlistId}/tracks`
    return await superagent
      .get(playlistUrl)
      .set('Authorization', this.headerAccessToken)
      .query({ limit, offset })
  }
}

module.exports = SpotifyClient
