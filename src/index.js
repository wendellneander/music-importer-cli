import Importer from './importer.js'

export function importFromSpotifyPlaylist({
                              playlistUrl,
                              playlistId,
                              folderPath,
                              audioBitrate = 128,
                              usePlaylistTitleAsFolderTitle = true,
                              log = false,
                              spotifyAccessToken,
                              youtubeApiKey
                            }) {
  new Importer({
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
}

export function importFromYTUrlt({
                     ytUrl,
                     ytId,
                     folderPath,
                     audioBitrate = 128,
                     usePlaylistTitleAsFolderTitle = true,
                     log = false,
                     spotifyAccessToken,
                     youtubeApiKey
                   }) {
  new Importer({
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
}

