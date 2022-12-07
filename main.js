const { importFromSpotifyPlaylist } = require('./importer')

importFromSpotifyPlaylist({
  playlistId: '51OcDcj1K4YKwdXNsIPT8z',
  folderPath: __dirname + '/downloads',
  audioBitrate: 320,
  log: true,
  spotifyAccessToken: 'BQDwT6QV0jYa4VJb3hIymRb0r3V6eWgUJjR5XvUpG1gxCRDirfodzZkH4bdg5psbqRF0pN8_d3MG2WZ6LkZnxorKXPzxnfYD4Vd8YqNZarSxYGtyTfSAvmFgyYjl2_ZTwsTiNs1Yc7VyJdjf2_Mw77u-MqN5Kw9tKeGABkYDNx_So790JgAi6oQYOMTa6m3ULno',
  youtubeApiKey: 'AIzaSyAQ9LwSwaNQBjPalbIeTjiU2LB0EidOiIU'
})
