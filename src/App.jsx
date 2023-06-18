import { useState, useEffect, useRef, useMemo } from 'react'
import './App.css'
import { Route, Link, Routes } from 'react-router-dom'
import { LazyLoadImage } from 'react-lazy-load-image-component'
import YouTube from 'react-youtube'
import { MdSkipNext, MdSkipPrevious, MdShuffle, MdPlayArrow, MdPause, MdRepeatOne, MdRepeatOneOn, MdKeyboardArrowDown, MdKeyboardArrowUp } from 'react-icons/md';
import LoadingBar from 'react-top-loading-bar'

const getPlaylistId = (url) => new URL(url).searchParams.get('list');

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
      setTimeout(doSync, 1000);
    })();
    return () => sync = false;
  }, [])

  return (
    <div className="w-full max-w-lg space-y-8 mb-8">
      <div>
        <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-zinc-200">
          Select a playlist
        </h2>
        <p className="mt-2 text-center text-sm text-zinc-500">
          Select a saved playlist to play
        </p>
      </div>
      {!Object.keys(playlists).length ? (
        <div className='text-center text-md text-zinc-500 flex flex-wrap justify-center gap-1'>
          <div>You don't have any saved playlists.</div>
          <Link to='/import' className='text-zinc-200 hover:text-zinc-50 font-medium underline underline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 rounded-sm'>Import a playlist</Link>
        </div>
      ) : (
        <div className='flex flex-col gap-2'>
          {Object.keys(playlists).map(playlistId => {
            let playlist = playlists[playlistId];
            return (
              <button key={playlistId} className={'items-center w-full bg-zinc-900 px-6 py-4 flex gap-5 rounded-lg shadow-sm opacity-50' + (!playlist?.queue ? ' cursor-default' : ' cursor-pointer hover:bg-zinc-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 !opacity-100')} tabIndex={!playlist?.queue ? '-1' : '0'}
                onClick={() => {
                  if (!playlist.queue) return;
                  setPlaylist(playlist)
                  history.replaceState(null, 'Youtube Player', '/play?list='+playlistId);
                }}
              >
                <a tabIndex='-1' href={playlist.url} target='_blank' onClick={e => e.stopPropagation()} className='focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-red-600 rounded-md'>
                  <div className="group aspect-square h-28 relative bg-gradient-to-tr	from-zinc-900 to-zinc-950 rounded-md shadow-sm overflow-hidden">
                    <div className="absolute inset-0 bg-cover bg-center z-0 group-hover:scale-110 duration-200 ease-in-out" style={{backgroundImage: 'url('+playlist.thumbnails.small+')'}}></div>
                  </div>
                </a>
                <div className='flex flex-col flex-1 items-start'>
                  <h3 className='text-lg text-zinc-200 font-bold text-left leading-tight'>{playlist.title}</h3>
                  <div className='flex flex-wrap pt-1'>
                    <div className='text-sm text-zinc-400 font-medium'>{playlist.channel}</div>
                    <div className='px-2 text-sm text-zinc-500'>·</div>
                    {!playlist.queue ? (
                      <div className='text-sm text-zinc-500'>Importing videos...</div>
                    ) : (
                      <div className='text-sm text-zinc-500'>{Object.keys(playlist.videoIds).length} videos</div>
                    )}
                  </div>
                  <div className='text-sm text-zinc-500 whitespace-pre-line text-left pt-2'>{playlist.description || '[No description]'}</div>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

function PlaylistQueue({initialQueue, videos, onClick, setQueueUpdateCallback}) {
  const [queue, setQueue] = useState(initialQueue);
  useEffect(() => {
    setQueueUpdateCallback((queue) => setQueue([...queue]));
  }, [queue, setQueue]);
  return (
    <div className='flex flex-col rounded-lg'>
      {queue.slice(0, 70).map((videoId, i) => {
        let video = videos[videoId];
        return (
          <button key={videoId} className='shadow-md bg-zinc-900 hover:bg-zinc-800 mb-px border-zinc-800 last:mb-0 px-4 py-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 focus-visible:z-10 last:rounded-b-lg first:rounded-t-lg'
            onClick={() => onClick(i)}
          >
            <div className='flex items-center space-x-3'>
              <LazyLoadImage
                className='h-7 aspect-video rounded-sm'
                src={video.thumbnails.small}
              />
              <div className='inline-flex flex-col flex-1 truncate'>
                <h1 className='truncate text-xs text-left flex-1 font-semibold text-zinc-300'>{video.title}</h1>
                <h1 className='truncate text-xs text-left text-zinc-500'>{video.channel}</h1>
              </div>
              <div className='pl-2 text-xs text-zinc-700 text-left'>{i || '#'}</div>
            </div>
          </button>
        )
      })}
    </div>
  )
}

function PauseButton({addPlayingListener, onClick}) {
  const [playing, setPlaying] = useState(false)
  useEffect(() => {
    addPlayingListener((playing) => setPlaying(playing));
  }, [playing, setPlaying])
  return (
    <button className='px-2 py-3 hover:text-zinc-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 rounded-sm'
      onClick={async () => {
        setPlaying(!playing);
        await onClick();
      }}
    >
      {!playing ? <MdPlayArrow className='w-8 h-8'/> : <MdPause className='w-8 h-8'/>}
    </button>
  )
}

function LoopOneButton({onClick}) {
  const [loop, setLoop] = useState(false)
  return (
    <button className='px-2 py-3 hover:text-zinc-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 rounded-sm'
      onClick={() => {
        onClick(!loop);
        setLoop(!loop);
      }}
    >
      {!loop ? <MdRepeatOne className='w-7 h-7'/> : <MdRepeatOneOn className='w-7 h-7'/>}
    </button>
  )
}

function DescriptionButton({onClick}) {
  const [description, setDescription] = useState(false);
  return (
    <button className='px-2 py-3 hover:text-zinc-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 rounded-sm'
      onClick={() => {
        onClick(!description);
        setDescription(!description);
      }}
    >
      {!description ? <MdKeyboardArrowDown className='w-7 h-7'/> : <MdKeyboardArrowUp className='w-7 h-7'/>}
    </button>
  )
}

function ChannelIcon({channelUrl}) {
  const [image, setImage] = useState('');
  useEffect(() => {
    (async () => {
      let resp = await fetch(
        'https://kamiak-io.fly.dev/yuu/get_channel_image?channel_url='+encodeURIComponent(channelUrl)
      );
      setImage(await resp.json());
    })()
  }, [image, channelUrl]);
  return image ? (
    <img src={image} className='w-8 h-8 rounded-full'/>
  ) : (
    <div className='w-8 h-8 rounded-full bg-zinc-800'></div>
  )
}

function PlayerController({playingCallback, playingRef, playerRef, loop, updatePlayer, playPrev, playNext, setVideoCallback}) {
  const [description, setDescription] = useState(false);
  const [video, setVideo] = useState('unloaded');
  useEffect(() => {
    setVideoCallback(setVideo);
  }, [video]);
  return (
    <div className='flex flex-col bg-zinc-900 text-zinc-300 rounded-lg shadow-sm'>
      <div className='flex px-2'>
        <DescriptionButton onClick={(newDescription) => setDescription(newDescription)}/>
        <button className='px-2 py-3 invisible'>
          <MdShuffle className='w-7 h-7'/>
        </button>
        <div className='flex-1'></div>
        <button className='px-1 py-3 hover:text-zinc-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 rounded-sm'
          onClick={playPrev}
        >
          <MdSkipPrevious className='w-7 h-7'/>
        </button>
        <PauseButton addPlayingListener={(callback) => playingCallback.current = callback}
          onClick={async () => {
            if (playingRef.current) await playerRef.current.internalPlayer.pauseVideo();
            else await playerRef.current.internalPlayer.playVideo();
            playingRef.current = !playingRef.current;
          }}
        />
        <button className='px-1 py-3 hover:text-zinc-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 rounded-sm'
          onClick={playNext}
        >
          <MdSkipNext className='w-7 h-7'/>
        </button>
        <div className='flex-1'></div>
        <LoopOneButton onClick={(newLoop) => loop.current = newLoop}/>
        <button className='px-2 py-3 hover:text-zinc-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 rounded-sm'
          onClick={async () => {
            shuffleQueue(queue.current);
            updatePlayer();
          }}
        >
          <MdShuffle className='w-7 h-7'/>
        </button>
      </div>
      {description && (
        <div className='px-5 py-5 text-xs border-t border-zinc-950 text-zinc-300 whitespace-pre-wrap break-words space-y-4'>
          <div className='flex items-center'>
            <a href={video.channel_url} target='_blank'>
              <ChannelIcon channelUrl={video.channel_url}/>
            </a>
            <a href={video.channel_url} target='_blank' className='font-semibold text-sm hover:text-zinc-200 px-3 py-1'>
              {video.channel}
            </a>
          </div>
          <div>
            {video.description ?? '[Re-import the playlist for video descriptions]'}
          </div>
        </div>
      )}
    </div>
  )
}

function PlayerPage({playlist, updateQueue, videos}) {
  const queue = useRef(playlist.queue);
  const playerRef = useRef(null);
  const playingRef = useRef(false);
  const playingCallback = useRef();
  const queueUpdateCallback = useRef();
  const videoCallback = useRef();
  const previousStates = useRef([-2, -2, -2]);
  const loop = useRef(false);
  useEffect(() => {
    setTitle();
  }, [playlist]);
  function setTitle() {
    document.title = `${playlist.title} · ${videos[queue.current[0]].title} · Yuu`;
  }
  function updatePlayer() {
    playerRef.current.internalPlayer.loadVideoById(queue.current[0]);
    setTitle();
    updateQueue(queue.current);
    queueUpdateCallback.current(queue.current);
    videoCallback.current?.({...videos[queue.current[0]]});
  }
  function seekTo(i) {
    const newQueue = [];
    for (let j = 0; j < queue.current.length; j++) {
      newQueue.push(queue.current[(i+j)%queue.current.length]);
    }
    queue.current = newQueue;
    updatePlayer();
  }
  const playCurr = () => playerRef.current.internalPlayer.playVideo();
  const playNext = () => seekTo(1);
  const playPrev = () => seekTo(queue.current.length-1);
  const youtubePlayer = useMemo(() => 
  <YouTube videoId={queue.current[0]}
    opts={{
      host: 'https://www.youtube-nocookie.com',
      playerVars: {autoplay: 1, origin: location.origin},
    }}
    ref={playerRef}
    onEnd={() => loop.current ? playCurr() : playNext()}
    onStateChange={async (state) => {
      if (state.data == 1) playingRef.current = true;
      if (state.data == 2) playingRef.current = false;
      if (state.data == -1 && previousStates.current == '0,-1,3') {
        playNext();
        previousStates.current[2] = 0;
      }
      if (playingCallback.current) playingCallback.current(playingRef.current);
      previousStates.current.shift();
      previousStates.current.push(state.data);
    }}
  />, [queue, playerRef, updatePlayer])

  return (
    <div className="w-full max-w-lg space-y-8 mb-8">
      <div>
        <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-zinc-200">
          {playlist.title}
        </h2>
        <p className="mt-2 text-center text-sm text-zinc-500">
          {playlist.queue.length} videos
        </p>
      </div>
      <div className='flex flex-col gap-3'>
        <div>
          <div id='videoContainer' className='w-full aspect-video rounded-lg shadow-lg overflow-hidden group'>
            {youtubePlayer}
          </div>
        </div>
        <PlayerController
          playingCallback={playingCallback}
          playingRef={playingRef}
          playerRef={playerRef}
          loop={loop}
          updatePlayer={updatePlayer}
          playPrev={playPrev}
          playNext={playNext}
          setVideoCallback={(callback) => {
            videoCallback.current = callback;
            videoCallback.current?.({...videos[queue.current[0]]});
          }}
        />
        <div>
          <PlaylistQueue videos={videos} initialQueue={queue.current}
            setQueueUpdateCallback={(callback) => queueUpdateCallback.current = callback}
            onClick={seekTo}
          />
        </div>
      </div>
    </div>
  )
}

function PlayerSwitcher({playlists, savePlaylists, syncPlaylists}) {
  const [playlist, setPlaylist] = useState(null);
  const [videos, setVideos] = useState();
  useEffect(() => {
    setTab(0);
    document.title = 'Select a playlist · Yuu';
  }, [])
  return (
    !playlist?.queue ? (
      <SelectPlaylistPage setPlaylist={async (playlist) => {
        let resp = await fetch('https://kamiak-io.fly.dev/yuu/get_playlist_videos?playlist_id='+getPlaylistId(playlist.url));
        setVideos(await resp.json());
        // Maybe show loading bar here
        setPlaylist(playlist);
      }} playlists={playlists} syncPlaylists={syncPlaylists}/>
    ) : (
      <PlayerPage playlist={playlist} videos={videos} updateQueue={(queue) => {
        playlist.queue = queue;
        const newPlaylists = {};
        newPlaylists[getPlaylistId(playlist.url)] = playlist;
        savePlaylists(newPlaylists);
      }}/>
    )
  )
}

function PlaylistLoadingPage({playlists, savePlaylists, syncPlaylists}) {
  const [playlist, setPlaylist] = useState({});
  const [videos, setVideos] = useState();
  const loading = useRef(false);
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    setTab(0);
    async function loadPlaylist() {
      setProgress(20);
      const playlistId = getPlaylistId(location.href);
      let prom;

      if (!(playlistId in playlists)) {
        prom = (async () => {
          await updatePlaylistInfo(playlists, savePlaylists, playlistId);
          await syncPlaylists();
        })();
      }

      setVideos(await (await fetch('https://kamiak-io.fly.dev/yuu/get_playlist_videos?playlist_id='+playlistId)).json());
      setProgress(60);
      
      if (!(playlistId in playlists)) await prom;

      setPlaylist(playlists[playlistId]);
      console.log('loaded', playlistId);
      loading.current = false;
      setProgress(100);
    }
    if (!playlist?.queue && !loading.current) {
      loading.current = true;
      loadPlaylist();
    }
    console.log('rerender');
  }, [playlist, videos]);

  return (
    <div className='w-full flex justify-center'>
      <LoadingBar color='#ff0000' progress={progress}/>
      {!playlist?.queue ? (
        <div></div>
      ) : (
        <PlayerPage playlist={playlist} videos={videos} updateQueue={(queue) => {
          playlist.queue = queue;
          const newPlaylists = {};
          newPlaylists[getPlaylistId(playlist.url)] = playlist;
          savePlaylists(newPlaylists);
        }}/>
      )}
    </div>
  )
}

function ImportPage({playlists, updatePlaylists}) {
  const [playlistUrl, setPlaylistUrl] = useState()
  useEffect(() => {
    setTab(1);
    document.title = 'Import a playlist · Yuu';
  }, [])
  return (
    <div className="w-full max-w-md space-y-8 mb-8">
      <div>
        <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-zinc-200">
          Import a playlist
        </h2>
        <p className="mt-2 text-center text-sm text-zinc-500">
          Download playlist informaton from Youtube for remote playback.<br/>
          The playlist must be public, and you don't need to import the entire playlist if you've already imported it on another device.
        </p>
      </div>
      <form className="mt-8 space-y-6" onSubmit={e => e.preventDefault()}>
        <div className="-space-y-1 rounded-md shadow-lg">
          <div>
            <label htmlFor="playlistUrl" className="sr-only">Enter a playlist url</label>
            <input onChange={e => setPlaylistUrl(e.target.value.trim())} id="playlistUrl" name="playlistUrl" type="text" autoComplete="off" className="relative block w-full rounded-md border-0 py-1.5 text-zinc-200 ring-1 ring-inset ring-zinc-800 placeholder:text-zinc-500 focus:z-10 focus:ring-2 focus:ring-inset focus:ring-red-600 text-sm leading-6 px-3 bg-zinc-950" placeholder='Enter a playlist url'/>
          </div>
        </div>
        <div>
          <button className="group relative flex w-full justify-center rounded-md bg-red-700 py-2 px-3 text-sm font-medium text-red-50 hover:bg-red-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 shadow-sm"
            onClick={async () => {
              let playlistId = getPlaylistId(playlistUrl);
              fetch('https://kamiak-io.fly.dev/yuu/import?playlist_id='+playlistId, {method: 'POST'});
              await updatePlaylistInfo(playlists, updatePlaylists, playlistId);
            }}
          >
            Import entire playlist
          </button>
          <button className="mt-2 group relative flex w-full justify-center rounded-md bg-zinc-900 py-2 px-3 text-sm font-medium text-zinc-400 hover:bg-zinc-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 shadow-sm"
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
  const playlists = useRef(JSON.parse(localStorage.playlists || '{}'));
  const [tab, setTab] = useState(0);
  const [playerCount, setPlayerCount] = useState(0);
  window.setTab = setTab;

  function savePlaylists(newPlaylists) {
    playlists.current = {...playlists.current, ...newPlaylists};
    localStorage.playlists = JSON.stringify(playlists.current);
  }

  function updatePlaylists(newPlaylists) {
    savePlaylists(newPlaylists);
    setCount(count+1);
  }

  async function syncPlaylists() {
    for (const playlistId in playlists.current) {
      await updatePlaylistInfo(playlists.current, updatePlaylists, playlistId);
      const playlist = playlists.current[playlistId];
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
      playlist.queue = Object.keys(newVideoIds).concat(playlist.queue);

      // Remove from queue video ids that were removed from the playlist
      let size = 0;
      for (let i in playlist.queue) {
        if (!playlist.videoIds[playlist.queue[i]]) continue;
        playlist.queue[size++] = playlist.queue[i];
      }
      playlist.queue.length = size;
    }
    updatePlaylists();
  }

  return (
    <div className="flex flex-col min-h-full items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-zinc-950 selection:bg-red-600/80 selection:text-white">
      <Routes>
        <Route path='/' element={<PlayerSwitcher key={'player'+playerCount} playlists={playlists.current} savePlaylists={savePlaylists} syncPlaylists={syncPlaylists}/>}></Route>
        <Route path='/play' element={<PlaylistLoadingPage playlists={playlists.current} savePlaylists={savePlaylists} syncPlaylists={syncPlaylists}/>}></Route>
        <Route path='/import' element={<ImportPage playlists={playlists.current} updatePlaylists={updatePlaylists}/>}></Route>
      </Routes>
      <footer className='fixed bottom-0 px-6 py-5 text-sm text-zinc-500 backdrop-blur-lg bg-zinc-950/80 flex z-50 border-1 border-zinc-950 border-b-0 w-full justify-center'>
        <div className='pr-3 border-r border-zinc-800 font-semibold focus-visible:text-zinc-300'>
          <Link to='/' className={'inline-flex h-full rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600' + (tab == 0 ? ' text-zinc-400' : '')} onClick={() => setPlayerCount(playerCount+1)}>Player</Link>
        </div>
        <div className='px-3 border-r border-zinc-800 font-semibold'>
          <Link to='/import' className={'inline-flex h-full rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600' + (tab == 1 ? ' text-zinc-400' : '')}>Import</Link>
        </div>
        <a href="https://github.com/jwseph/youtube-player" target='_blank' className='rounded-sm font-semibold ml-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600'>Github</a>
      </footer>
    </div>
  )
}

export default App
