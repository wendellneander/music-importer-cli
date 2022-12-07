const superagent = require('superagent')

class YouTubeClient {
  constructor(apiKey) {
    this.API_URL = 'https://www.googleapis.com/youtube/v3'
    this.API_KEY = apiKey
  }

  async search(term) {
    const searchUrl = `${this.API_URL}/search`
    return await superagent
      .get(searchUrl)
      .query({
        q: term,
        key: this.API_KEY,
        type: 'video',
        part: 'snippet'
      })
  }
}

module.exports = YouTubeClient
