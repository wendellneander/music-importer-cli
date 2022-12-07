const Importer = require('./importer')

module.exports = {
  importFromSpotifyPlaylist: ({
                                playlistUrl,
                                playlistId,
                                folderPath = __dirname + '/downloads',
                                audioBitrate = 128,
                                usePlaylistTitleAsFolderTitle = true,
                                log = false,
                                spotifyAccessToken,
                                youtubeApiKey
                              }) => {
    return new Importer({
      playlistSource: Importer.SOURCE_SPOTIFY,
      playlistUrl,
      playlistId,
      folderPath,
      audioBitrate,
      usePlaylistTitleAsFolderTitle,
      log,
      spotifyAccessToken,
      youtubeApiKey
    }).run()
  },

  importFromYTUrlt: ({
                       ytUrl,
                       ytId,
                       folderPath = __dirname + '/downloads',
                       audioBitrate = 128,
                       usePlaylistTitleAsFolderTitle = true,
                       log = false,
                       spotifyAccessToken,
                       youtubeApiKey
                     }) => {
    return new Importer({
      playlistSource: Importer.SOURCE_YT,
      playlistUrl: ytUrl,
      playlistId: ytId,
      folderPath,
      audioBitrate,
      usePlaylistTitleAsFolderTitle,
      log,
      spotifyAccessToken,
      youtubeApiKey
    }).run()
  },
}

