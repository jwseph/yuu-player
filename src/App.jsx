import { useState, useEffect, useRef, useMemo } from 'react'
import './App.css'
import { Route, Link, Routes, useNavigate } from 'react-router-dom'
import { LazyLoadImage } from 'react-lazy-load-image-component'
import YouTube from 'react-youtube'
// import { MdSkipNext, MdSkipPrevious, MdShuffle, MdPlayArrow, MdPause, MdRepeatOne, MdRepeatOneOn, MdKeyboardArrowDown, MdKeyboardArrowUp } from 'react-icons/md';
import { RiPlayFill, RiPauseFill, RiSkipBackFill, RiSkipForwardFill, RiShuffleFill, RiRepeat2Fill, RiRepeatOneFill, RiArrowDownSFill, RiArrowUpSFill, RiArrowDownSLine, RiArrowLeftSLine, RiMoreLine, RiAddLine, RiGithubLine, RiExternalLinkLine } from "react-icons/ri";
import LoadingBar from 'react-top-loading-bar'

const BASE = 'https://kamiak-io.fly.dev/yuu/'

const getPlaylistId = (url) => new URL(url).searchParams.get('list');
const getVideoId = (url) => {
  let parts = url.split('/');
  return parts[parts.length-1];
}

const shuffleQueue = (queue) => {
  for (let i = queue.length-1; i > 0; i--) {
    const j = Math.random()*(i+1)|0;
    [queue[i], queue[j]] = [queue[j], queue[i]];
  }
}

const updatePlaylistInfo = async (playlists, updatePlaylists, playlistId) => {
  // console.log(BASE+'get_playlist_info?playlist_id='+playlistId)
  let resp = await fetch(BASE+'get_playlist_info?playlist_id='+playlistId);
  let playlist = await resp.json();
  playlists[playlistId] = {...playlists[playlistId] || {}, ...playlist};
  updatePlaylists();
}

function blendColors(colorA, colorB, amount) {
  // Source: https://stackoverflow.com/questions/6367010/average-2-hex-colors-together-in-javascript
  const [rA, gA, bA] = colorA.match(/\w\w/g).map((c) => parseInt(c, 16));
  const [rB, gB, bB] = colorB.match(/\w\w/g).map((c) => parseInt(c, 16));
  const r = Math.round(rA+(rB-rA)*amount).toString(16).padStart(2, '0');
  const g = Math.round(gA+(gB-gA)*amount).toString(16).padStart(2, '0');
  const b = Math.round(bA+(bB-bA)*amount).toString(16).padStart(2, '0');
  return '#'+r+g+b;
}

function SelectPlaylistPage({playlists, syncPlaylists, setPlaylist, changePlayerCount}) {
  useEffect(() => {
    var sync = true;
    (async function doSync() {
      if (!sync) return;
      await syncPlaylists();
      setTimeout(doSync, 200);
    })();
    return () => sync = false;
  }, [])

  return (
    <div className="w-full max-w-3xl py-12 px-6 sm:px-6 lg:px-6 space-y-6 mb-8">
      <div className='flex justify-between items-center text-zinc-200'>
        <a href='https://github.com/jwseph/youtube-player' className='invisible p-3 -ml-3 active:opacity-50 active:scale-95 duration-100 ease-in-out'>
          <RiGithubLine className='w-7 h-7'/>
        </a>
        <div>
          <h2 className="text-center text-2xl font-semibold tracking-tighter">
          Select a playlist
          </h2>
        </div>
        <Link to='/import' className='p-3 -mr-3 active:opacity-50 active:scale-95 duration-100 ease-in-out'>
          <RiAddLine className='w-7 h-7'/>
        </Link>
      </div>
      {!Object.keys(playlists).length ? (
        <div className='text-center text-sm text-zinc-400 flex flex-wrap justify-center gap-1'>
          Import a playlist to get started (+)
        </div>
      ) : (
        <div className='flex flex-col gap-3'>
          {Object.keys(playlists).map(playlistId => {
            let playlist = playlists[playlistId];
            return (
              <button key={playlistId} className={'items-center w-full bg-zinc-900 px-6 py-6 flex gap-5 rounded-md shadow-sm opacity-50' + (!playlist?.queue ? ' cursor-default' : ' cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 !opacity-100 active:opacity-50 active:scale-95 duration-100')} tabIndex={!playlist?.queue ? '-1' : '0'}
                onClick={() => {
                  if (!playlist.queue) return;
                  setPlaylist(playlist)
                  history.replaceState(null, 'Youtube Player', '/play?list='+playlistId);
                }}
              >
                <div className="aspect-square h-28 relative bg-gradient-to-tr	from-zinc-900 to-zinc-950 rounded-sm shadow-sm overflow-hidden">
                  <div className="absolute inset-0 bg-cover bg-center z-0 duration-200 ease-in-out" style={{backgroundImage: 'url('+playlist.thumbnails.small+')'}}></div>
                </div>
                <div className='flex flex-col flex-1 items-start'>
                  <h3 className='text-lg text-zinc-200 font-semibold tracking-tight text-left leading-tight'>{playlist.title}</h3>
                  <div className='flex flex-wrap pt-1'>
                    <div className='text-sm text-zinc-400 font-medium tracking-tight'>{playlist.channel}</div>
                    <div className='px-2 text-sm text-zinc-500'>·</div>
                    {!playlist.queue ? (
                      <div className='text-sm text-zinc-500'>Importing videos...</div>
                    ) : (
                      <div className='text-sm text-zinc-500'>{playlist.queue.length} videos</div>
                    )}
                  </div>
                  {playlist.description && (
                    <div className='text-sm text-zinc-500 whitespace-pre-line text-left pt-2'>{playlist.description}</div>
                  )}
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
    <div className='flex flex-col'>
      {queue.slice(0, 70).map((videoId, i) => {
        let video = videos[videoId];
        if (i == 0) return;
        return (
          <button key={videoId} className='active:opacity-50 active:scale-95 duration-100 ease-in-out mb-px last:mb-0 py-4 px-6 sm:px-6 lg:px-6 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 focus-visible:z-10 last:rounded-b-sm first:rounded-t-sm'
            onClick={() => onClick(i)}
          >
            <div className='flex items-center space-x-3'>
              <LazyLoadImage
                className='h-7 aspect-video rounded-sm'
                src={video.thumbnails.small}
              />
              <div className='inline-flex flex-col flex-1 truncate'>
                <h1 className='truncate text-xs text-left flex-1 font-semibold text-zinc-300'>{video.title}</h1>
                <span className='truncate text-xs text-left text-zinc-500'>{video.channel}</span>
              </div>
              <div className='pl-2 text-xs text-zinc-700 text-left'>{i || '-'}</div>
            </div>
          </button>
        )
      })}
      <div className='text-center text-xs font-medium tracking-tight pt-6 text-zinc-500'>Showing 1 - {queue.slice(0, 70).length} of {queue.length}</div>
    </div>
  )
}

function PauseButton({addPlayingListener, onClick, color}) {
  const [playing, setPlaying] = useState(false)
  useEffect(() => {
    addPlayingListener((playing) => setPlaying(playing));
  }, [playing, setPlaying])
  return (
    <button
      className='p-3 text-[var(--darkIconColor)] bg-zinc-50 active:opacity-50 active:scale-95 duration-100 ease-in-out aspect-square rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600'
      onClick={async () => {
        setPlaying(!playing);
        await onClick();
      }}
      style={{'--darkIconColor': blendColors('#18181b', color, 0.11)}}
    >
      {!playing ? <RiPlayFill className='w-9 h-9 duration-1000 ease-in-out'/> : <RiPauseFill className='w-9 h-9 duration-1000 ease-in-out'/>}
    </button>
  )
}

function LoopOneButton({onClick}) {
  const [loop, setLoop] = useState(false)
  return (
    <button className='p-3 -mr-3 text-zinc-50 active:opacity-50 active:scale-95 duration-100 ease-in-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 rounded-sm'
      onClick={() => {
        onClick(!loop);
        setLoop(!loop);
      }}
    >
      {!loop ? <RiRepeat2Fill className='w-5 h-5'/> : <RiRepeatOneFill className='w-5 h-5'/>}
    </button>
  )
}

function DescriptionButton({onClick}) {
  const [description, setDescription] = useState(false);
  return (
    <button className='p-3 hover:text-zinc-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 rounded-sm'
      onClick={() => {
        onClick(!description);
        setDescription(!description);
      }}
    >
      {!description ? <RiArrowDownSFill className='w-7 h-7'/> : <RiArrowUpSFill className='w-7 h-7'/>}
    </button>
  )
}

function PlayerBar({playerRef}) {
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(1);
  const dragging = useRef(false);
  const endingDragging = useRef(false);
  const updateTimeDelay = useRef(0);
  async function updateDuration() {
    setDuration(await playerRef.current.internalPlayer.getDuration());
  }
  async function updateTime() {
    if (dragging.current) return;
    if (updateTimeDelay.current > 0) {
      updateTimeDelay.current--;
      return;
    }
    const player = playerRef.current.internalPlayer;
    let state = await player.getPlayerState();
    if (state != 1 && state != 2) return;
    setTime(await playerRef.current.internalPlayer.getCurrentTime());
  }
  async function getIntendedTime(e) {
    let el = document.getElementById('PlayerBar');
    let rect = el.getBoundingClientRect();
    let pos = (e.clientX-rect.left)/el.clientWidth;
    let newDuration = await playerRef.current.internalPlayer.getDuration();
    let newTime = newDuration*pos;
    setDuration(newDuration);
    return Math.max(0, Math.min(newDuration, newTime));
  }
  function startDragging(e) {
    dragging.current = true;
    whenDragging(e);
  }
  async function stopDragging(e) {
    if (!dragging.current || endingDragging.current) return;

    endingDragging.current = true;
    await playerRef.current.internalPlayer.seekTo(await getIntendedTime(e), true);
    endingDragging.current = false;

    dragging.current = false;
    updateTimeDelay.current = 5;
  }
  async function whenDragging(e) {
    if (!dragging.current || endingDragging.current) return;
    let newTime = await getIntendedTime(e);
    setTime(newTime);
    await playerRef.current.internalPlayer.seekTo(newTime, false);
  }
  function startDraggingTouch(e) {
    startDragging(e.changedTouches[0]);
  }
  async function stopDraggingTouch(e) {
    await stopDragging(e.changedTouches[0]);
  }
  async function whenDraggingTouch(e) {
    await whenDragging(e.changedTouches[0]);
  }
  function formatTime(s) {
    if (s < 0) return '0:00';
    const twoDigits = (t) => t < 10 ? '0'+t : ''+t;
    let seconds = twoDigits(s%60);
    let minutes = twoDigits((s/60|0)%60);
    let hours = twoDigits(s/3600|0);
    let res = minutes+':'+seconds;
    if (+hours) res = hours+':'+res;
    if (res[0] == '0') res = res.substring(1);
    return res;
  }
  useEffect(() => {
    document.addEventListener('mouseup', stopDragging);
    document.addEventListener('touchend', stopDraggingTouch);
    document.addEventListener('touchcancel', stopDraggingTouch);
    document.addEventListener('mousemove', whenDragging);
    document.addEventListener('touchmove', whenDraggingTouch);
    updateTime();
    updateDuration();
    const interval = setInterval(updateTime, 100);
    const interval2 = setInterval(updateDuration, 100);
    return () => {
      clearInterval(interval);
      clearInterval(interval2);
      document.removeEventListener('mouseup', stopDragging);
      document.removeEventListener('touchend', stopDraggingTouch);
      document.removeEventListener('touchcancel', stopDraggingTouch);
      document.removeEventListener('mousemove', whenDragging);
      document.removeEventListener('touchmove', whenDraggingTouch);
    }
  }, [])
  return (
    <div className='select-none'>
      <div
        id='PlayerBar'
        className='w-full h-6 flex items-center cursor-pointer touch-none'
        onMouseDown={(e) => startDragging(e.nativeEvent)}
        onTouchStart={(e) => startDraggingTouch(e.nativeEvent)}
      >
        <div
          className='w-full h-1 bg-zinc-50/20 rounded-full'
        >
          <div className='w-full h-full flex items-center'>
            <div className='h-1 bg-zinc-50 rounded-full' style={{width: time/duration*100+'%'}}></div>
            <div className={'rounded-full bg-zinc-50 duration-75 ease-in-out'+(!dragging.current || endingDragging.current ? ' w-3 h-3 -ml-1.5' : ' w-4 h-4 -ml-2')}></div>
          </div>
        </div>
      </div>
      <div className='w-full flex justify-between'>
        <div className='text-xs font-light'>{formatTime(time|0)}</div>
        <div className='text-xs font-light'>{'-'+formatTime(duration-time|0)}</div>
      </div>
    </div>
  )
}

function PlayerController({playingCallback, playingRef, playerRef, loop, updatePlayer, playPrev, playNext, getPrev, getNext, shuffle, setVideoCallback, color}) {
  const [description, setDescription] = useState(false);
  const [video, setVideo] = useState();
  const [channelImage, setChannelImage] = useState();
  const [channelSubscribers, setChannelSubscribers] = useState('');
  const URL_REGEX = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/;
  useEffect(() => {
    setVideoCallback(setVideo);
  }, []);
  // useEffect(() => {
  //   (async () => {
  //     if (!video) return;
  //     let resp = await fetch(
  //       BASE+'get_channel_info?channel_url='+encodeURIComponent(video.channel_url)
  //     );
  //     let data = await resp.json();
  //     setChannelImage(data.image);
  //     setChannelSubscribers(data.subscribers);
  //   })()
  // }, [video]);
  async function togglePlaying() {
    if (playingRef.current) await playerRef.current.internalPlayer.pauseVideo();
    else await playerRef.current.internalPlayer.playVideo();
    playingRef.current = !playingRef.current;
  }
  function handleKeyPressed(e) {
    if (e.key == ' ') {
      e.preventDefault();
      togglePlaying();
    }
    if (e.key == 'ArrowLeft') {
      e.preventDefault();
      playPrev();
    }
    if (e.key == 'ArrowRight') {
      e.preventDefault();
      playNext();
    }
  }
  useEffect(() => {
    document.addEventListener('keydown', handleKeyPressed);
    return () => document.removeEventListener('keydown', handleKeyPressed);
  })
  return (
    <div className='py-5 space-y-4'>
      {video && (
        <div className='flex flex-col space-y-1 pb-2'>
          <h2 className='text-2xl font-semibold tracking-tight truncate max-w-full'>{video.title}</h2>
          <span className='text-md font-light truncate max-w-full'>{video.channel}</span>
        </div>
      )}
      {playerRef.current && (
        <PlayerBar playerRef={playerRef}/>
      )}
      <div className='flex flex-col'>
        <div className='flex'>
          {/* <DescriptionButton onClick={(newDescription) => setDescription(newDescription)}/> */}
          <button className='p-3 -ml-3 text-zinc-50 active:opacity-50 active:scale-95 duration-100 ease-in-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 rounded-sm'
            onClick={async () => {
              shuffle();
              updatePlayer();
            }}
          >
            <RiShuffleFill className='w-5 h-5'/>
          </button>
          <div className='flex-1'></div>
          <button className='group flex flex-row-reverse items-center justify-center p-3 select-none text-zinc-50 active:scale-95 duration-100 ease-in-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 rounded-sm'
            onClick={playPrev}
          >
            <img className='w-16 scale-150 aspect-video opacity-30 group-active:opacity-100 duration-100 ease-in-out rounded-sm' src={getPrev().thumbnails.small}/>
            <RiSkipBackFill className='absolute w-9 h-9 z-20 group-active:opacity-0 duration-100 ease-in-out'/>
          </button>
          <div className='flex-1 max-w-[3rem]'></div>
          <div>
            <PauseButton addPlayingListener={(callback) => playingCallback.current = callback}
              onClick={togglePlaying}
              color={color}
            />
          </div>
          <div className='flex-1 max-w-[3rem]'></div>
          <button className='group flex items-center justify-center p-3 select-none text-zinc-50 active:scale-95 duration-100 ease-in-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 rounded-sm'
            onClick={playNext}
          >
            <img className='w-16 scale-150 aspect-video opacity-30 group-active:opacity-100 duration-100 ease-in-out rounded-sm' src={getNext().thumbnails.small}/>
            <RiSkipForwardFill className='absolute w-9 h-9 z-10 group-active:opacity-0 duration-100 ease-in-out'/>
          </button>
          <div className='flex-1'></div>
          <LoopOneButton onClick={(newLoop) => loop.current = newLoop}/>
        </div>
        {description && (
          <div className='px-5 py-5 text-xs border-t border-zinc-950 text-zinc-300 whitespace-pre-wrap break-words space-y-4'>
            <div className='flex items-center'>
              <a href={video.channel_url} target='_blank'>
                {channelImage ? (
                  <img src={channelImage} className='w-12 h-12 rounded-full' crossOrigin='anonymous'/>
                ) : (
                  <div className='w-12 h-12 rounded-full bg-zinc-800'></div>
                )}
              </a>
              <div className='flex flex-col py-1'>
                <a href={video.channel_url} target='_blank' className='font-bold text-base hover:text-zinc-200 px-3'>
                  {video.channel}
                </a>
                <span className='px-3 text-zinc-400'>{channelSubscribers}</span>
              </div>
            </div>
            <div className='text-zinc-400'>
              {video.description == null || video.description == undefined ? (
                '[Re-import the playlist for video descriptions]'
              ) : (
                video.description
                .split(/([\s：（）\[\]\(\)])/)
                .map((token, i) =>
                  URL_REGEX.test(token) ? (
                    <a key={'desclink_'+i} href={token} target='_blank' className='font-medium text-zinc-300 hover:text-zinc-200 underline underline-offset-2 decoration-zinc-700 hover:decoration-zinc-600'>{token}</a>
                  ) : token
                )
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function PlayerPage({playlist, updateQueue, videos, changePlayerCount, playlistId}) {
  const queue = useRef(playlist.queue);
  const playerRef = useRef(null);
  const playingRef = useRef(false);
  const playingCallback = useRef();
  const queueUpdateCallback = useRef();
  const videoCallback = useRef();
  const videoCallback2 = useRef();
  const previousStates = useRef([-2, -2, -2]);
  const loop = useRef(false);
  const [video, setVideo] = useState({...videos[queue.current[0]]});
  const [color, setColor] = useState('#18181b');
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])
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
    videoCallback2.current?.({...videos[queue.current[0]]});
    setVideo({...videos[queue.current[0]]});
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
  const getNext = () => videos[queue.current[1]];
  const getPrev = () => videos[queue.current[queue.current.length-1]];
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
  />, [])
  async function updateColor() {
    let image = video.thumbnails.small;
    let r = await fetch(BASE+'get_color?image_url='+encodeURIComponent(image))
    let newColor = await r.json();
    if (video.thumbnails.small != image) return;
    setColor(newColor+'7a');
  }
  useEffect(() => {
    if (!video) {
      setColor('#18181b');
      return;
    }
    updateColor();
  }, [video]);

  return (
    <div className='w-full flex flex-col items-center'>
      {/* <BackgroundGradient
        setVideoCallback={(callback) => {
          videoCallback2.current = callback;
          videoCallback2.current?.({...videos[queue.current[0]]});
        }}
      /> */}
      <div className="w-full space-y-8 text-zinc-50">
        <div className='flex flex-col' style={{'--accentColor': color}}>
          <div className='bg-[var(--accentColor)] duration-1000 ease-in-out shadow-sm'>
            <div className='min-h-[100svh] flex flex-col items-center bg-gradient-to-b from-zinc-900/30 to-zinc-900/80 duration-1000 ease-in-out'>
              {/* <BackgroundGradient
                setVideoCallback={(callback) => {
                  videoCallback2.current = callback;
                  videoCallback2.current?.({...videos[queue.current[0]]});
                }}
              /> */}
              <div className='max-w-3xl w-full inline-flex flex-1 flex-col justify-between gap-12 pt-16 pb-20 z-10'>
                <div className='flex justify-between items-center px-6 sm:px-6 lg:px-6'>
                  <Link to='/' className='p-3 -ml-3 active:opacity-50 active:scale-95 duration-100 ease-in-out' onClick={changePlayerCount}>
                    <RiArrowLeftSLine className='w-7 h-7'/>
                  </Link>
                  <div>
                    <h2 className="text-center text-sm font-semibold tracking-tight">
                      {playlist.title}
                    </h2>
                    <h2 className="text-center text-sm font-light">
                      {playlist.channel}
                    </h2>
                  </div>
                  <a target='_blank' href={`https://www.youtube.com/watch?v=${getVideoId(video.video_url)}&list=${playlistId}`} className='w-10 h-10 -mr-3 flex justify-center items-center active:opacity-50 active:scale-95 duration-100 ease-in-out'>
                    <RiExternalLinkLine className='w-5 h-5'/>
                  </a>
                </div>
                <div className='px-6 sm:px-6 lg:px-6'>
                  <div id='videoContainer' className='w-full aspect-video rounded-md shadow-2xl overflow-hidden group'>
                    {youtubePlayer}
                  </div>
                </div>
                <div className='px-6 sm:px-6 lg:px-6'>
                  <PlayerController
                    playingCallback={playingCallback}
                    playingRef={playingRef}
                    playerRef={playerRef}
                    loop={loop}
                    updatePlayer={updatePlayer}
                    playPrev={playPrev}
                    playNext={playNext}
                    getPrev={getPrev}
                    getNext={getNext}
                    shuffle={() => shuffleQueue(queue.current)}
                    setVideoCallback={(callback) => {
                      videoCallback.current = callback;
                      videoCallback.current?.({...videos[queue.current[0]]});
                    }}
                    color={color}
                  />
                </div>

              </div>
            </div>
            <div
              className='w-full h-px bg-[var(--borderColor)] duration-1000 ease-in-out'
              style={{'--borderColor': blendColors('#18181b', color, 0.3)}}
            ></div>
          </div>
          <div className='flex flex-col items-center'>
            <div className='max-w-3xl w-full py-8'>
              <PlaylistQueue videos={videos} initialQueue={queue.current}
                setQueueUpdateCallback={(callback) => queueUpdateCallback.current = callback}
                onClick={seekTo}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function PlayerSwitcher({playlists, savePlaylists, syncPlaylists, changePlayerCount}) {
  const [playlist, setPlaylist] = useState(null);
  const [videos, setVideos] = useState();
  useEffect(() => {
    setTab(0);
    document.title = 'Select a playlist · Yuu';
  }, [])
  return (
    !playlist?.queue ? (
      <SelectPlaylistPage setPlaylist={async (playlist) => {
        let resp = await fetch(BASE+'get_playlist_videos?playlist_id='+getPlaylistId(playlist.url));
        setVideos(await resp.json());
        // Maybe show loading bar here
        setPlaylist(playlist);
      }} playlists={playlists} syncPlaylists={syncPlaylists} changePlayerCount={changePlayerCount}/>
    ) : (
      <PlayerPage playlist={playlist} videos={videos} changePlayerCount={changePlayerCount} playlistId={getPlaylistId(playlist.url)} updateQueue={(queue) => {
        playlist.queue = queue;
        const newPlaylists = {};
        newPlaylists[getPlaylistId(playlist.url)] = playlist;
        savePlaylists(newPlaylists);
      }}/>
    )
  )
}

function PlaylistLoadingPage({playlists, savePlaylists, syncPlaylists, changePlayerCount}) {
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

      setVideos(await (await fetch(BASE+'get_playlist_videos?playlist_id='+playlistId)).json());
      setProgress(60);
      
      if (!(playlistId in playlists)) await prom;

      setPlaylist(playlists[playlistId]);
      loading.current = false;
      setProgress(100);
    }
    if (!playlist?.queue && !loading.current) {
      loading.current = true;
      loadPlaylist();
    }
  }, [playlist, videos]);

  return (
    <div className='w-full flex justify-center'>
      <LoadingBar color='#ff0000' progress={progress}/>
      {!playlist?.queue ? (
        <div></div>
      ) : (
        <PlayerPage playlist={playlist} videos={videos} changePlayerCount={changePlayerCount} playlistId={getPlaylistId(playlist.url)} updateQueue={(queue) => {
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
  const navigate = useNavigate();
  const [playlistUrl, setPlaylistUrl] = useState()
  useEffect(() => {
    setTab(1);
    document.title = 'Import a playlist · Yuu';
  }, [])
  return (
    <div className="w-full max-w-3xl py-12 px-6 sm:px-6 lg:px-6 space-y-8 mb-8">
      <div className='flex justify-between items-center'>
        <Link to='/' className='p-3 -ml-3 active:opacity-50 active:scale-95 duration-100 ease-in-out'>
          <RiArrowLeftSLine className='w-7 h-7'/>
        </Link>
        <div>
          <h2 className="text-center text-2xl font-semibold tracking-tighter">
            Import a playlist
          </h2>
        </div>
        <a href='https://github.com/jwseph/youtube-player' className='invisible p-3 -mr-3 active:opacity-50 active:scale-95 duration-100 ease-in-out'>
          <RiGithubLine className='w-7 h-7'/>
        </a>
      </div>
      <form className="mt-8 space-y-8" onSubmit={e => e.preventDefault()}>
        <div className="-space-y-1 rounded-sm shadow-lg">
          <div>
            <label htmlFor="playlistUrl" className="sr-only">Enter a playlist URL</label>
            <input onChange={e => setPlaylistUrl(e.target.value.trim())} id="playlistUrl" name="playlistUrl" type="text" autoComplete="off" className="relative block w-full rounded-md border-0 py-1.5 bg-zinc-900 text-zinc-200 ring-1 ring-inset ring-zinc-700 placeholder:text-zinc-500 focus:z-10 focus:ring-2 focus:ring-inset focus:ring-red-600 text-sm shadow-sm leading-6 px-3" placeholder='Enter a playlist URL'/>
          </div>
        </div>
        <div className='flex gap-6'>
          <div className='flex-1'>
            <button className="relative flex w-full justify-center rounded-md bg-red-700 py-2 px-3 text-sm font-medium text-red-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 active:opacity-50 active:scale-95 duration-100 ease-in-out"
              onClick={async () => {
                let playlistId = getPlaylistId(playlistUrl);
                fetch(BASE+'import?playlist_id='+playlistId, {method: 'POST'});
                await updatePlaylistInfo(playlists, updatePlaylists, playlistId);
              }}
            >
              New playlist
            </button>
            <div className='py-3 space-y-2'>
              <p className='md:px-4 text-xs text-zinc-500'>
                Choose this option if this is your first time using this playlist with Yuu (on any device)
              </p>
              <p className='md:px-4 text-xs text-zinc-500'>
                The playlist must be public.
              </p>
            </div>
          </div>
          <div className='flex-1'>
            <button className="relative flex w-full justify-center rounded-md bg-zinc-800 py-2 px-3 text-sm font-medium text-zinc-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 active:opacity-50 active:scale-95 duration-100 ease-in-out"
              onClick={async () => {
                let playlistId = getPlaylistId(playlistUrl);
                fetch(BASE+'update?playlist_id='+playlistId, {method: 'POST'});
                await updatePlaylistInfo(playlists, updatePlaylists, playlistId);
                navigate('/');
              }}
            >
              Update playlist
            </button>
            <p className='md:px-4 py-3 text-xs text-zinc-500'>
              Choose this option if you have imported the playlist before (on any device)
            </p>
          </div>
        </div>
      </form>
    </div>
  )
}

function App() {
  const [count, setCount] = useState(0)
  const [playlists, setPlaylists] = useState(JSON.parse(localStorage.playlists || '{}'))
  const [tab, setTab] = useState(0);
  const [playerCount, setPlayerCount] = useState(0);

  window.setTab = setTab;

  function changePlayerCount() {
    setPlayerCount(playerCount+1);
  }

  function savePlaylists(newPlaylists) {
    const updatedPlaylists = {...playlists, ...newPlaylists};
    setPlaylists(updatedPlaylists);
    localStorage.playlists = JSON.stringify(updatedPlaylists);
  }

  function updatePlaylists(newPlaylists) {
    savePlaylists(newPlaylists);
    setCount(count+1);
  }

  async function syncPlaylists() {
    for (const playlistId in playlists) {
      await updatePlaylistInfo(playlists, updatePlaylists, playlistId);
      const playlist = playlists[playlistId];
      let resp = await fetch(BASE+'get_playlist_video_ids?playlist_id='+playlistId);
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
    <div className="flex flex-col min-h-full items-center justify-center bg-zinc-950 selection:bg-red-700/90 selection:text-red-100">
      <Routes>
        <Route path='/' element={<PlayerSwitcher key={'player'+playerCount} playlists={playlists} savePlaylists={savePlaylists} syncPlaylists={syncPlaylists} changePlayerCount={changePlayerCount}/>}></Route>
        <Route path='/play' element={<PlaylistLoadingPage playlists={playlists} savePlaylists={savePlaylists} syncPlaylists={syncPlaylists} changePlayerCount={changePlayerCount}/>}></Route>
        <Route path='/import' element={<ImportPage playlists={playlists} updatePlaylists={updatePlaylists}/>}></Route>
      </Routes>
      <div className='flex flex-col items-center pb-4'>
        <a href='https://github.com/jwseph/youtube-player' className='p-2 active:opacity-50 active:scale-95 duration-100 ease-in-out text-zinc-500'>
          <RiGithubLine className='w-5 h-5'/>
        </a>
      </div>
      {/* <footer className='fixed bottom-0 px-6 py-5 text-sm text-zinc-500 backdrop-blur-lg bg-zinc-950/80 flex z-50 border-1 border-zinc-950 border-b-0 w-full justify-center'>
        <div className='pr-3 border-r border-zinc-800 font-semibold focus-visible:text-zinc-300'>
          <Link to='/' className={'inline-flex h-full rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600' + (tab == 0 ? ' text-zinc-400' : '')} onClick={changePlayerCount}>Player</Link>
        </div>
        <div className='px-3 border-r border-zinc-800 font-semibold'>
          <Link to='/import' className={'inline-flex h-full rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600' + (tab == 1 ? ' text-zinc-400' : '')}>Import</Link>
        </div>
        <a href="https://github.com/jwseph/youtube-player" target='_blank' className='rounded-sm font-semibold ml-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600'>Github</a>
      </footer> */}
    </div>
  )
}

export default App
