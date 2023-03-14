import { useState, useEffect, useRef } from 'react'
import './App.css'
import { Route, Link, Routes, useNavigate } from 'react-router-dom';
import { LazyLoadImage } from 'react-lazy-load-image-component';
import YouTube from 'react-youtube';

const getPlaylistId = (url) => {
  console.log(url);
  return new URL(url).searchParams.get('list');
}

const shuffleQueue = (queue) => {
  for (let i = queue.length-1; i > 0; i--) {
    const j = Math.random()*(i+1)|0;
    [queue[i], queue[j]] = [queue[j], queue[i]];
  }
}

const updatePlaylistInfo = async (playlists, updatePlaylists, playlistId) => {
  let resp = await fetch('https://kamiak-io.fly.dev/yuu/get_playlist_info?playlist_id='+playlistId, {method: 'GET'});
  let playlist = await resp.json();
  playlists[playlistId] = {...playlists[playlistId] || {}, ...playlist};
  updatePlaylists();
}

function SelectPlaylistPage({playlists, syncPlaylists, setPlaylist}) {
  useEffect(() => {
    var sync = true;
    (async function doSync() {
      if (!sync) return;
      await syncPlaylists();
      setTimeout(doSync, 3000);
    })();
    return () => sync = false;
  }, [])

  return (
    <div className="w-full max-w-md space-y-8 mb-8">
      <div>
        <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-zinc-50">
          Playlist player
        </h2>
        <p className="mt-2 text-center text-sm text-zinc-400">
          Select a saved playlist to play
        </p>
      </div>
      <div className='rounded-lg shadow-lg overflow-hidden border border-zinc-700'>
        {Object.keys(playlists).map(playlistId => {
          let playlist = playlists[playlistId];
          return (
            <button key={playlistId} className={'items-center w-full bg-zinc-800 border-b border-zinc-700 last:border-b-0 px-6 py-4 flex gap-5' + (!playlist || !playlist.queue ? '' : ' cursor-pointer hover:bg-zinc-700 focus:bg-zinc-700')} tabIndex={!playlist || !playlist.queue ? '-1' : '0'}
              onClick={() => setPlaylist(playlist)}
            >
              <a tabIndex='-1' href={playlist.url} target='_blank' onClick={e => e.stopPropagation()}>
                <img src={playlist.thumbnails.small} className='aspect-square object-cover h-28 rounded-md shadow-sm'/>
              </a>
              <div className='flex flex-col flex-1 items-start'>
                <h3 className='text-lg text-zinc-50 font-bold'>{playlist.title}</h3>
                <div className='flex flex-wrap'>
                  <div className='text-sm text-zinc-300 font-medium'>{playlist.channel}</div>
                  <div className='px-2 text-sm text-zinc-400'>·</div>
                  {!playlist.queue ? (
                    <div className='text-sm text-zinc-400'>Importing videos...</div>
                  ) : (
                    <div className='text-sm text-zinc-400'>{Object.keys(playlist.videoIds).length} videos</div>
                  )}
                </div>
                <div className='text-sm text-zinc-400 whitespace-pre-line text-left pt-2'>{playlist.description || '[No description]'}</div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function PlayerPage({playlist, updatePlaylists, videos}) {
  const queue = playlist.queue;
  const playerRef = useRef(null);
  const [count, setCount] = useState(0);
  const [autoplaying, setAutoplaying] = useState(false);
  return (
    <div className="w-full max-w-md space-y-8 mb-8">
      <div>
        <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-zinc-50">
          Playlist player
        </h2>
        <p className="mt-2 text-center text-sm text-zinc-400">
          Selected playlist: {playlist.title}
        </p>
      </div>
      <div>
        <div id='videoContainer' className='w-full aspect-video rounded-lg shadow-lg overflow-hidden group'>
          <YouTube videoId={queue[0]} opts={{host: 'https://www.youtube-nocookie.com', playerVars: {autoplay: 1, playsinline: 1}}}
            ref={playerRef}
            onEnd={() => {
              queue.push(queue.shift());
              setCount(count+1);
              playerRef.current.internalPlayer.mute();
              updatePlaylists();
              setAutoplaying(true);
            }}
            onPlay={() => {
              if (!autoplaying) return;
              playerRef.current.internalPlayer.unMute();
              setAutoplaying(false);
            }}
          />
        </div>
      </div>
      <div className='flex bg-zinc-800 border border-zinc-700 overflow-hidden rounded-lg'>
        <button className='px-4 py-2 border-r border-zinc-700 last:border-0 hover:bg-zinc-700 focus:bg-zinc-700'
          onClick={() => {
            queue.unshift(queue.pop());
            setCount(count+1);
            updatePlaylists();
          }}
        >
          Prev
        </button>
        <div className='px-4 py-2 border-r border-zinc-700 last:border-0 flex-1'></div>
        <button className='px-4 py-2 border-r border-zinc-700 last:border-0 hover:bg-zinc-700 focus:bg-zinc-700'
          onClick={() => {
            shuffleQueue(queue);
            setCount(count+1);
            updatePlaylists();
          }}
        >
          Shuffle
        </button>
        <div className='px-4 py-2 border-r border-zinc-700 last:border-0 flex-1'></div>
        <button className='px-4 py-2 border-r border-zinc-700 last:border-0 hover:bg-zinc-700 focus:bg-zinc-700'
          onClick={() => {
            queue.push(queue.shift());
            setCount(count+1);
            updatePlaylists();
          }}
        >
          Next
        </button>
      </div>
      <div>
        <div className='border border-zinc-700 rounded-lg overflow-hidden shadow-sm'>
          {queue.map((videoId, i) => {
            let video = videos[videoId];
            window.videos = videos;
            return video && (
              <div key={videoId} className='bg-zinc-800 border-b border-zinc-700 last:border-0 px-4 py-2'>
                <div className='flex items-center space-x-3'>
                  <div className='text-xs text-zinc-400 w-7 text-right'>{i || '-'}</div>
                  <h1 className='truncate text-sm flex-1'>{video.title}</h1>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function PlayerSwitcher({playlists, syncPlaylists, updatePlaylists}) {
  const [playlist, setPlaylist] = useState(null);
  const [videos, setVideos] = useState();
  return (
    !playlist || !playlist.queue ? (
      <SelectPlaylistPage setPlaylist={async (playlist) => {
        let resp = await fetch('https://kamiak-io.fly.dev/yuu/get_playlist_videos?playlist_id='+getPlaylistId(playlist.url));
        setVideos(await resp.json());
        // Maybe show loading bar here
        setPlaylist(playlist);
      }} playlists={playlists} syncPlaylists={syncPlaylists}/>
    ) : (
      <PlayerPage playlist={playlist} updatePlaylists={updatePlaylists} videos={videos}/>
    )
  )
}

function ImportPage({playlists, updatePlaylists}) {
  const [playlistUrl, setPlaylistUrl] = useState()
  return (
    <div className="w-full max-w-md space-y-8 mb-8">
      <div>
        <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-zinc-50">
          Import a playlist
        </h2>
        <p className="mt-2 text-center text-sm text-zinc-400">
          Download playlist informaton from Youtube for remote playback.<br/>
          The playlist must be public, and you don't need to import the entire playlist if you've already imported it on another device.
        </p>
      </div>
      <form className="mt-8 space-y-6" onSubmit={e => e.preventDefault()}>
        <div className="-space-y-1 rounded-md shadow-lg">
          <div>
            <label htmlFor="playlistUrl" className="sr-only">Enter a playlist url</label>
            <input onChange={e => setPlaylistUrl(e.target.value.trim())} id="playlistUrl" name="playlistUrl" type="text" autoComplete="off" className="relative block w-full rounded-md border-0 py-1.5 text-zinc-100 ring-1 ring-inset ring-zinc-700 placeholder:text-zinc-400 focus:z-10 focus:ring-2 focus:ring-inset focus:ring-red-600 sm:text-sm sm:leading-6 px-3 bg-zinc-900" placeholder='Enter a playlist url'/>
          </div>
        </div>
        <div>
          <button className="group relative flex w-full justify-center rounded-md bg-red-700 py-2 px-3 text-sm font-medium text-red-50 hover:bg-red-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 shadow-sm ring-1 ring-red-600 hover:ring-red-500 ring-inset"
            onClick={async () => {
              let playlistId = getPlaylistId(playlistUrl);
              fetch('https://kamiak-io.fly.dev/yuu/import?playlist_id='+playlistId, {method: 'POST'});
              await updatePlaylistInfo(playlists, updatePlaylists, playlistId);
            }}
          >
            Import entire playlist
          </button>
          <button className="mt-2 group relative flex w-full justify-center rounded-md bg-zinc-800 py-2 px-3 text-sm font-medium text-zinc-300 hover:bg-zinc-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 shadow-sm ring-1 ring-zinc-700 hover:ring-zinc-600 ring-inset"
            onClick={async () => {
              let playlistId = getPlaylistId(playlistUrl);
              fetch('https://kamiak-io.fly.dev/yuu/update?playlist_id='+playlistId, {method: 'POST'});
              await updatePlaylistInfo(playlists, updatePlaylists, playlistId);
            }}
          >
            Update existing playlist
          </button>
        </div>
      </form>
    </div>
  )
}

function App() {
  const [count, setCount] = useState(0)
  const [playlists, setPlaylists] = useState(JSON.parse(localStorage.playlists || '{}'))

  function updatePlaylists() {
    setPlaylists(playlists);
    localStorage.playlists = JSON.stringify(playlists);
    console.log('supposed to update playlists in localStorage');
  }

  async function syncPlaylists() {
    for (const playlistId in playlists) {
      await updatePlaylistInfo(playlists, updatePlaylists, playlistId);
      const playlist = playlists[playlistId];
      let resp = await fetch('https://kamiak-io.fly.dev/yuu/get_playlist_video_ids?playlist_id='+playlistId);
      let newVideoIds = await resp.json();
      if (newVideoIds == null) continue;
      if (!playlist.queue) {
        playlist.queue = [];
        playlist.videoIds = {};
      }
      const oldVideoIds = playlist.videoIds;
      playlist.videoIds = {...newVideoIds};
      for (const videoId in oldVideoIds) delete newVideoIds[videoId];
      playlist.queue = Object.keys(newVideoIds).concat(playlist.queue);  // may contain video ids that were removed
    }
    updatePlaylists();
  }

  return (
    <div className="flex flex-col min-h-full items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-zinc-900 selection:bg-red-600/80 selection:text-white">
      <Routes>
        <Route path='/' element={<PlayerSwitcher playlists={playlists} updatePlaylists={updatePlaylists} syncPlaylists={syncPlaylists}/>}></Route>
        <Route path='/import' element={<ImportPage playlists={playlists} updatePlaylists={updatePlaylists}/>}></Route>
      </Routes>
      <footer className='fixed bottom-2 p-4 text-sm text-zinc-400 rounded-lg backdrop-blur-lg bg-zinc-900/80 flex'>
        <div className='pr-3 border-r border-zinc-700 font-semibold'>
          <Link to='/'>Player</Link>
        </div>
        <div className='px-3 border-r border-zinc-700 font-semibold'>
          <Link to='/import'>Import</Link>
        </div>
        <a href="https://github.com/jwseph/youtube-player" target='_blank' className='font-semibold ml-3'>Github</a>
      </footer>
    </div>
  )
}

export default App
