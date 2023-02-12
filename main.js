#!/usr/bin/env node
import dotenv from 'dotenv'
dotenv.config()

import fs from 'fs'
import inquirer from 'inquirer'
import {importFromSpotifyPlaylist} from './src/index.js'

inquirer.prompt([
  {
    type: 'list',
    name: 'platform_source',
    message: 'Escolha a plataforma da música ou playlist que deseja baixar:',
    choices: ['Spotify' /**, 'Youtube'**/],
    default: 'Spotify'
  },
  {
    type: 'input',
    name: 'playlist_id',
    message: 'Insira a url da música ou playlist:',
    default: 'https://open.spotify.com/playlist/1IdHsF58U4bAMabaRoBcFS?si=74998dfcc52e4d68',
    validate: (url) => {
      if (url.includes('open.spotify.com/playlist/')) {
        const split = url.split('open.spotify.com/playlist/')
        const playlistId = split[1].split('?')[0]
        return !!playlistId
      }
      return false
    }
  },
  {
    type: 'list',
    name: 'audio_bitrate',
    message: 'Escolha a qualidade:',
    choices: ['320kbps', '128kbps'],
    default: '320kbps'
  },
  {
    type: 'input',
    name: 'folder_path',
    message: 'Salver arquivos em: (caminho completo da pasta)',
    validate: (path) => {
      return fs.existsSync(path)
    }
  },
  {
    type: 'input',
    name: 'folder_title',
    message: 'Nome da pasta de destino: (deixar em branco para usar o nome da playlist)',
  },
]).then(answers => {
  if (answers['platform_source'] === 'Spotify') {
    const url = answers['playlist_id'].split('open.spotify.com/playlist/')
    const playlistId = url[1].split('?')[0]

    importFromSpotifyPlaylist({
      playlistId,
      folderPath: answers['folder_path'],
      audioBitrate: answers['audio_bitrate'] === '128kbps' ? 128 : 320,
      log: true,
      usePlaylistTitleAsFolderTitle: !!answers['folder_title'],
      folderTitle: answers['folder_title'] || `tracks-${new Date().toDateString()}`,
      youtubeApiKey: process.env.YOUTUBE_API_KEY
    })
  } else if (answers['platform_source'] === 'Youtube') {
    console.log('Em breve.')
  }
})
