import { useState, useEffect, useRef, useMemo } from 'react'
import './App.css'
import { Route, Link, Routes, useNavigate, useParams } from 'react-router-dom'
import { LazyLoadImage } from 'react-lazy-load-image-component'
import YouTube from 'react-youtube'
// import { MdSkipNext, MdSkipPrevious, MdShuffle, MdPlayArrow, MdPause, MdRepeatOne, MdRepeatOneOn, MdKeyboardArrowDown, MdKeyboardArrowUp } from 'react-icons/md';
import { RiPlayFill, RiPauseFill, RiSkipBackFill, RiSkipForwardFill, RiShuffleFill, RiRepeat2Fill, RiRepeatOneFill, RiArrowDownSFill, RiArrowUpSFill, RiArrowDownSLine, RiArrowLeftSLine, RiMoreLine, RiAddLine, RiGithubLine, RiExternalLinkLine, RiGroupLine, RiPlayListAddLine } from "react-icons/ri";
import LoadingBar from 'react-top-loading-bar'
import { socket } from './socket'
import { ToastContainer, toast } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'

const BASE = 'https://kamiak-io.fly.dev/yuu/'

const classNames = (...classes) => classes.filter(Boolean).join(' ');

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
  return queue;
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

function SelectPlaylistPage({playlists, syncPlaylists, setPlaylist}) {
  useEffect(() => {
    syncPlaylists();
    const interval = setInterval(syncPlaylists, 250)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="w-full max-w-3xl py-12 px-6 sm:px-6 lg:px-6 space-y-6 mb-8">
      <div className='flex justify-between items-center text-zinc-200'>
        <Link to='/s' className='w-10 h-10 -mr-3 flex justify-center items-center active:opacity-50 active:scale-95 duration-100 ease-in-out'>
          <RiGroupLine className='w-5 h-5'/>
        </Link>
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

function PlaylistQueue({queue, videos, index, onClick}) {
  const BEHIND = 1, AHEAD = 23;
  const [center, setCenter] = useState();
  useEffect(() => {
    if (queue.length <= BEHIND+1+AHEAD) {
      setCenter(BEHIND);
      return;
    }
    let center = index;
    if (center-BEHIND < 0) center = BEHIND;
    if (center+1+AHEAD > queue.length) center = queue.length-1-AHEAD;
    setCenter(center);
  }, [queue, index])
  return (
    <div className='flex flex-col'>
      {queue.map((videoId, i) => {
        if (i < center-BEHIND || i >= center+1+AHEAD) return null;
        let video = videos[videoId];
        return (
          <button key={videoId}
            className={classNames(
              'active:opacity-50 active:scale-95 duration-100 ease-in-out mb-px last:mb-0 py-4 px-6 sm:px-6 lg:px-6 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 focus-visible:z-10 rounded-none sm:rounded-md lg:rounded-md',
              index == i ? 'bg-zinc-900' : 'bg-zinc-950',
            )}
            onClick={() => onClick(i)}
          >
            <div className='flex items-center space-x-3'>
              <div className='relative'>
                <div className={classNames(
                  'absolute bg-zinc-900/60 w-full h-full flex items-center justify-center duration-100',
                  index == i ? 'opacity-100' : 'opacity-0',
                )}>
                  <RiPlayFill className='w-6 h-6 text-zinc-50 drop-shadow-sm'/>
                </div>
                <LazyLoadImage
                  className='h-7 aspect-video rounded-sm'
                  src={video.thumbnails.small}
                />
              </div>
              <div className='inline-flex flex-col flex-1 truncate'>
                <h1 className='truncate text-xs text-left flex-1 text-zinc-300'>{video.title}</h1>
                <span className='truncate text-xs text-left text-zinc-500'>{video.channel}</span>
              </div>
              <div className='pl-2 text-xs text-zinc-500 text-left'>{i+1}</div>
            </div>
          </button>
        )
      })}
      <div className='text-center text-xs font-medium tracking-tight pt-6 text-zinc-500'>Showing {(queue.length > 0) * center-BEHIND+1} - {Math.min(center+AHEAD+1, queue.length)} of {queue.length}</div>
    </div>
  )
}

function PauseButton({addPlayingListener, onClick, color, video, changePlaying}) {
  const [playing, setPlaying] = useState(false)
  useEffect(() => {
    addPlayingListener((playing) => setPlaying(playing));
  }, [playing, setPlaying])
  return (
    <button
      className='p-3 text-[var(--darkIconColor)] bg-zinc-50 active:opacity-50 active:scale-95 disabled:opacity-50 disabled:scale-100 duration-100 ease-in-out aspect-square rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600'
      onClick={async () => {
        if (changePlaying) {
          changePlaying(playing);
          return;
        }
        setPlaying(!playing);
        await onClick();
      }}
      style={{'--darkIconColor': blendColors('#18181b', color, 0.11)}}
      disabled={!video}
    >
      {!playing ? <RiPlayFill className='w-9 h-9 duration-1000 ease-in-out'/> : <RiPauseFill className='w-9 h-9 duration-1000 ease-in-out'/>}
    </button>
  )
}

function LoopOneButton({loopOne, setLoopOne, video, onLoopOneClick}) {
  return (
    <button className='p-3 -mr-3 text-zinc-50 active:opacity-50 active:scale-95 disabled:opacity-50 disabled:scale-100 duration-100 ease-in-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 rounded-sm'
      onClick={() => {
        if (onLoopOneClick) {
          onLoopOneClick();
          return;
        }
        setLoopOne(!loopOne);
      }}
      disabled={!video}
    >
      {!loopOne ? <RiRepeat2Fill className='w-5 h-5'/> : <RiRepeatOneFill className='w-5 h-5'/>}
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

function PlayerBar({playerRef, video, onDragStop}) {
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

    let newTime = await getIntendedTime(e);

    endingDragging.current = true;
    if (!onDragStop) await playerRef.current.internalPlayer.seekTo(newTime, true);
    endingDragging.current = false;

    dragging.current = false;
    updateTimeDelay.current = 5;
    
    console.log('STOP DRAGGING', newTime, onDragStop);

    onDragStop?.(newTime);
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
    <div className={classNames('select-none', !video && 'opacity-50')}>
      <div
        id='PlayerBar'
        className={classNames('group w-full h-6 flex items-center touch-none', video && 'cursor-pointer')}
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

function PlayerController({video, playingCallback, playingRef, playerRef, loopOne, setLoopOne, onLoopOneClick, playPrev, playNext, getPrev, getNext, shuffle, color, onDragStop, changePlaying}) {
  const [description, setDescription] = useState(false);
  const [channelImage, setChannelImage] = useState();
  const [channelSubscribers, setChannelSubscribers] = useState('');
  const URL_REGEX = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/;
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
        <PlayerBar playerRef={playerRef} video={video} onDragStop={onDragStop}/>
      )}
      <div className='flex flex-col'>
        <div className='flex'>
          {/* <DescriptionButton onClick={(newDescription) => setDescription(newDescription)}/> */}
          <button className='p-3 -ml-3 text-zinc-50 active:opacity-50 active:scale-95 disabled:opacity-50 disabled:scale-100 duration-100 ease-in-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 rounded-sm'
            onClick={shuffle}
            disabled={!video}
          >
            <RiShuffleFill className='w-5 h-5'/>
          </button>
          <div className='flex-1'></div>
          <button className='group flex flex-row-reverse items-center justify-center p-3 select-none text-zinc-50 active:scale-95 disabled:scale-100 duration-100 ease-in-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 rounded-sm'
            onClick={playPrev}
            disabled={!video}
          >
            {video && <img className='w-16 scale-150 aspect-video opacity-30 group-active:opacity-100 duration-100 ease-in-out rounded-sm' src={getPrev().thumbnails.small}/>}
            <RiSkipBackFill className='absolute w-9 h-9 z-20 group-active:opacity-0 group-disabled:opacity-50 drop-shadow-sm duration-100 ease-in-out'/>
          </button>
          <div className='flex-1 max-w-[3rem]'></div>
          <div>
            <PauseButton addPlayingListener={(callback) => playingCallback.current = callback}
              onClick={togglePlaying}
              color={color}
              video={video}
              changePlaying={changePlaying}
            />
          </div>
          <div className='flex-1 max-w-[3rem]'></div>
          <button className='group flex items-center justify-center p-3 select-none text-zinc-50 active:scale-95 disabled:scale-100 duration-100 ease-in-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 rounded-sm'
            onClick={playNext}
            disabled={!video}
          >
            {video && <img className='w-16 scale-150 aspect-video opacity-30 group-active:opacity-100 duration-100 ease-in-out rounded-sm' src={getNext().thumbnails.small}/>}
            <RiSkipForwardFill className='absolute w-9 h-9 z-20 group-active:opacity-0 group-disabled:opacity-50 drop-shadow-sm duration-100 ease-in-out'/>
          </button>
          <div className='flex-1'></div>
          <LoopOneButton loopOne={loopOne} setLoopOne={setLoopOne} video={video} onLoopOneClick={onLoopOneClick}/>
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

function PlayerPage({playlist, updatePlaylistLocalStorage, videos, changePlayerCount, playlistId}) {
  const [queue, setQueue] = useState([...playlist.queue]);
  const [index, setIndex] = useState(playlist.index);
  const [video, setVideo] = useState({...videos[queue[index]]});
  const [color, setColor] = useState('#18181b');
  const playerRef = useRef(null);
  const playingRef = useRef(false);
  const playingCallback = useRef();
  const previousStates = useRef([-2, -2, -2]);
  const [loopOne, setLoopOne] = useState(false);
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [])
  useEffect(() => {
    updatePlaylistLocalStorage(queue, index);
    setVideo({...videos[queue[index]]});
    playerRef.current.internalPlayer.loadVideoById(queue[index]);
  }, [queue, index])
  useEffect(() => {
    if (!video) {
      setColor('#18181b');
      return;
    }
    document.title = `${playlist.title} · ${video.title} · Yuu`;
    updateColor();
  }, [video]);
  const wrapIndex = (i) => (i+queue.length)%queue.length;
  const playCurr = () => playerRef.current.internalPlayer.playVideo();
  const playNext = () => setIndex(wrapIndex(index+1));
  const playPrev = () => setIndex(wrapIndex(index-1));
  const getNext = () => videos[queue[wrapIndex(index+1)]];
  const getPrev = () => videos[queue[wrapIndex(index-1)]];
  const shuffle = () => {
    setQueue([...shuffleQueue(queue)]);
    setIndex(0);
  }
  const autoNext = useRef();
  useEffect(() => {
    autoNext.current = loopOne ? playCurr : playNext;
  }, [index, loopOne])
  const youtubePlayer = useMemo(() => 
  <YouTube videoId={queue[index]}
    opts={{
      host: 'https://www.youtube-nocookie.com',
      playerVars: {autoplay: 1, origin: location.origin},
    }}
    ref={playerRef}
    onEnd={() => autoNext.current()}
    onStateChange={async (state) => {
      if (state.data == 1) playingRef.current = true;
      if (state.data == 2) playingRef.current = false;
      if (state.data == -1 && previousStates.current == '0,-1,3') {
        playNext();
        previousStates.current[2] = 0;
      }
      playingCallback.current?.(playingRef.current);
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

  return (
    <div className='w-full flex flex-col items-center'>
      <div className="w-full space-y-8 text-zinc-50">
        <div className='flex flex-col' style={{'--accentColor': color}}>
          <div className='bg-[var(--accentColor)] duration-1000 ease-in-out shadow-sm'>
            <div className='min-h-[100svh] flex flex-col items-center bg-gradient-to-b from-zinc-900/30 to-zinc-900/80 duration-1000 ease-in-out'>
              <div className='max-w-3xl w-full inline-flex flex-1 flex-col justify-between gap-12 pt-16 pb-20 z-10'>
                <div className='flex justify-between items-center px-6 sm:px-6 lg:px-6'>
                  <Link to='/' className='w-10 h-10 -ml-3 flex justify-center items-center active:opacity-50 active:scale-95 duration-100 ease-in-out' onClick={changePlayerCount}>
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
                    video={video}
                    playingCallback={playingCallback}
                    playingRef={playingRef}
                    playerRef={playerRef}
                    loopOne={loopOne}
                    setLoopOne={setLoopOne}
                    playPrev={playPrev}
                    playNext={playNext}
                    getPrev={getPrev}
                    getNext={getNext}
                    shuffle={shuffle}
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
              <PlaylistQueue queue={queue} videos={videos} index={index} onClick={(i) => setIndex(i)}/>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function SessionPage({changePlayerCount}) {
  const { session } = useParams();
  const [videos, setVideos] = useState({});
  const [playback, setPlayback] = useState({queue: [], index: 0});
  const [video, setVideo] = useState(null);
  const [color, setColor] = useState('#18181b');
  const [videoId, setVideoId] = useState();
  const streamId = useRef(session);
  const [displayedStreamId, setDisplayedStreamId] = useState(session)
  const playerRef = useRef(null);
  const playingRef = useRef(false);
  const playingCallback = useRef();
  const previousStates = useRef([-2, -2, -2]);
  const [loopOne, setLoopOne] = useState(false);
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [])
  useEffect(() => {
    if (playback.index < 0 || playback.index >= playback.queue.length) {
      setVideoId(null);
      return;
    }
    setVideoId(playback.queue[playback.index]);
  }, [playback])
  useEffect(() => {
    if (!videoId) {
      setVideo(null);
      return;
    }
    setVideo({...videos[videoId]});
    console.log('LOADING VIDEO')
    playerRef.current.internalPlayer.loadVideoById(videoId);
  }, [videoId])
  useEffect(() => {
    if (!video) {
      document.title = `Group session · Yuu`;
      setColor('#18181b');
      return;
    }
    document.title = `Group session · ${video.title} · Yuu`;
    updateColor();
  }, [video]);
  const wrapIndex = (i) => (i+playback.queue.length)%playback.queue.length;
  const playCurr = () => playerRef.current.internalPlayer.playVideo();
  const playNext = () => {
    socket.emit('select_video', {
      stream_id: streamId.current,
      video_id: playback.queue[wrapIndex(playback.index+1)],
    });
  }
  const playPrev = () => {
    socket.emit('select_video', {
      stream_id: streamId.current,
      video_id: playback.queue[wrapIndex(playback.index-1)],
    });
  }
  const getNext = () => videos[playback.queue[wrapIndex(playback.index+1)]];
  const getPrev = () => videos[playback.queue[wrapIndex(playback.index-1)]];
  const shuffle = () => {
    setPlayback({queue: [...shuffleQueue(playback.queue)], index: 0});
  }
  const autoNext = useRef();
  useEffect(() => {
    autoNext.current = loopOne ? playCurr : playNext;
  }, [videoId, loopOne])
  const youtubePlayer = useMemo(() => 
  <YouTube
    opts={{
      host: 'https://www.youtube-nocookie.com',
      playerVars: {autoplay: 1, origin: location.origin},
    }}
    ref={playerRef}
    onEnd={() => autoNext.current()}
    onStateChange={async (state) => {
      if (state.data == 1) playingRef.current = true;
      if (state.data == 2) playingRef.current = false;
      if (state.data == -1 && previousStates.current == '0,-1,3') {
        playNext();
        previousStates.current[2] = 0;
      }
      playingCallback.current?.(playingRef.current);
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
    document.addEventListener('keydown', addItemsCallback);
    return () => document.removeEventListener('keydown', addItemsCallback)
  }, [])
  async function useNewPlayData(data) {
    console.log('update', data);
    console.log(data.playing);
    setVideos({...data.videos});
    setPlayback({queue: [...data.queue], index: data.index});
    if (!data.queue.length) return;
    setLoopOne(data.loop_one);
    let currentProgress = await playerRef.current.internalPlayer.getCurrentTime();
    if (Math.abs(data.progress-currentProgress) > .5) {
      await playerRef.current.internalPlayer.seekTo(data.progress);
    }
    if (playingRef.current != data.playing) {
      if (data.playing) await playerRef.current.internalPlayer.playVideo();
      else await playerRef.current.internalPlayer.pauseVideo();
      playingRef.current = data.playing;
      playingCallback.current?.(playingRef.current);
    }
  }
  useEffect(() => {
    console.log('yay', streamId.current, !streamId.current);
    if (!streamId.current) {
      console.log('Creating stream...')
      streamId.current = ' ';
      socket.emit('create_stream', (stream_id) => {
        streamId.current = stream_id;
        setDisplayedStreamId(stream_id);
        console.log('Created stream', stream_id)
      })
    }
    socket.on('update', useNewPlayData);
    const interval = setInterval(() => {
      console.log('stream id', streamId.current)
      if (!streamId.current) return;
      socket.emit('get_stream', {stream_id: streamId.current}, useNewPlayData);
      // socket.emit('get_stream', {stream_id: streamId}, (data) => {
      //   console.log('ping', data)
      // })
    }, 500)
    return () => {
      socket.emit('leave_stream');
      socket.removeAllListeners();
      clearInterval(interval);
    }
  }, [])
  function addItemsCallback(e) {
    if (e.key == 'v' && e.ctrlKey) {
      e.preventDefault();
      addItems();
    }
  }
  async function addItems() {
    let text;
    try {
      text = await navigator.clipboard.readText();
    } catch {
      toast.error('Clipboard permission required')
      return;
    }
    let url = text.trim(), params;
    try {
      if (url.includes('yuu.pages.dev/s/') || url.includes('localhost:5173/s/')) {
        throw new Error('Trying to create URL using this page')
      }
      params = new URL(url).searchParams;
    } catch {
      toast('Copy a video or playlist URL, then add it to the queue by pressing the top-right button or Ctrl+V');
      return;
    }
    let videoId = params.get('v');
    if (!videoId && url.includes('youtu.be')) {
      videoId = getVideoId(url);
    }
    let playlistId = params.get('list');
    if (videoId) {
      console.log('Video URL detected')
      socket.emit('add_video', {
        stream_id: streamId.current,
        video_id: videoId,
      })
      toast('Adding video', {autoClose: 1000})
      console.log('done');
      return;
    }
    if (playlistId) {
      console.log('Playlist URL detected');
      socket.emit('add_playlist', {
        stream_id: streamId.current,
        playlist_id: playlistId,
      })
      toast('Adding playlist', {autoClose: 5000})
      console.log('done')
      return;
    }
    toast.error('Please check that you have copied the correct URL')
  }
  useEffect(() => {
    if (!displayedStreamId) return;
    history.replaceState({}, '', location.origin+'/s/'+displayedStreamId);
  }, [displayedStreamId])

  return (
    <div className='w-full flex flex-col items-center'>
      <div className="w-full space-y-8 text-zinc-50">
        <div className='flex flex-col' style={{'--accentColor': color}}>
          <div className='bg-[var(--accentColor)] duration-1000 ease-in-out shadow-sm'>
            <div className='min-h-[100svh] flex flex-col items-center bg-gradient-to-b from-zinc-900/30 to-zinc-900/80 duration-1000 ease-in-out'>
              <div className='max-w-3xl w-full inline-flex flex-1 flex-col justify-between gap-12 pt-16 pb-20 z-10'>
                <div className='flex justify-between items-center px-6 sm:px-6 lg:px-6'>
                  <Link to='/' className='w-10 h-10 -ml-3 flex justify-center items-center active:opacity-50 active:scale-95 duration-100 ease-in-out' onClick={changePlayerCount}>
                    <RiArrowLeftSLine className='w-7 h-7'/>
                  </Link>
                  <div>
                    <h2 className="text-center text-sm font-semibold tracking-tight">
                      Group session
                    </h2>
                    <h2 className="text-center text-sm font-light">
                      {displayedStreamId}
                    </h2>
                  </div>
                  <button className='w-10 h-10 -mr-3 flex justify-center items-center active:opacity-50 active:scale-95 duration-100 ease-in-out'
                    onClick={addItems}
                  >
                    <RiPlayListAddLine className='w-5 h-5'/>
                  </button>
                </div>
                <div className='px-6 sm:px-6 lg:px-6'>
                  <div id='videoContainer' className='w-full aspect-video rounded-md shadow-2xl overflow-hidden group'>
                    {!video && <div className='w-full h-full bg-zinc-800'>
                      <div className='w-full h-full p-[20%] flex justify-center items-center'>
                        <RiPlayListAddLine className='h-full aspect-square flex-1 text-zinc-700'/>
                      </div>
                    </div>}
                    {youtubePlayer}
                  </div>
                </div>
                <div className='px-6 sm:px-6 lg:px-6'>
                  <PlayerController
                    video={video}
                    playingCallback={playingCallback}
                    playingRef={playingRef}
                    playerRef={playerRef}
                    loopOne={loopOne}
                    setLoopOne={setLoopOne}
                    onLoopOneClick={() => {
                      socket.emit('toggle_loop_one', {
                        stream_id: streamId.current,
                      })
                    }}
                    playPrev={playPrev}
                    playNext={playNext}
                    getPrev={getPrev}
                    getNext={getNext}
                    shuffle={shuffle}
                    color={color}
                    onDragStop={(newProgress) => {
                      console.log('seek to', newProgress);
                      socket.emit('seek', {
                        stream_id: streamId.current,
                        progress: newProgress,
                      })
                    }}
                    changePlaying={(newPlaying) => {
                      socket.emit('toggle_playing', {
                        stream_id: streamId.current,
                      })
                    }}
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
              <PlaylistQueue queue={playback.queue} videos={videos} index={playback.index}
                onClick={(i) => {
                  socket.emit('select_video', {
                    stream_id: streamId.current,
                    video_id: playback.queue[i],
                  })
                }}
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
    document.title = 'Select a playlist · Yuu';
  }, [])
  return (
    !playlist?.queue ? (
      <SelectPlaylistPage setPlaylist={async (playlist) => {
        let resp = await fetch(BASE+'get_playlist_videos?playlist_id='+getPlaylistId(playlist.url));
        setVideos(await resp.json());
        // Maybe show loading bar here
        setPlaylist(playlist);
      }} playlists={playlists} syncPlaylists={syncPlaylists}/>
    ) : (
      <PlayerPage playlist={playlist} videos={videos} changePlayerCount={changePlayerCount} playlistId={getPlaylistId(playlist.url)} updatePlaylistLocalStorage={(queue, index) => {
        playlist.queue = queue;
        playlist.index = index;
        savePlaylists({[getPlaylistId(playlist.url)]: playlist})
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
        <PlayerPage playlist={playlist} videos={videos} changePlayerCount={changePlayerCount} playlistId={getPlaylistId(playlist.url)} updatePlaylistLocalStorage={(queue, index) => {
          playlist.queue = queue;
          playlist.index = index;
          savePlaylists({[getPlaylistId(playlist.url)]: playlist})
        }}/>
      )}
    </div>
  )
}

function ImportPage({playlists, updatePlaylists}) {
  const navigate = useNavigate();
  const [playlistUrl, setPlaylistUrl] = useState()
  useEffect(() => {
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
  const [playerCount, setPlayerCount] = useState(0);

  useEffect(() => {
    (async () => {
      for (const playlistId in playlists) {
        await updatePlaylistInfo(playlists, updatePlaylists, playlistId);
      }
    })();
  }, [])

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
      const playlist = playlists[playlistId];
      playlist.index = playlist.index ?? 0;
      let resp = await fetch(BASE+'get_playlist_video_ids?playlist_id='+playlistId);
      let newVideoIds = await resp.json();
      if (newVideoIds == null) continue;
      playlist.queue = playlist.queue ?? [];
      const oldVideoIds = playlist.videoIds = playlist.videoIds ?? {};
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
        <Route path='/s' element={<SessionPage changePlayerCount={changePlayerCount}/>}></Route>
        <Route path='/s/:session' element={<SessionPage changePlayerCount={changePlayerCount}/>}></Route>
      </Routes>
      <div className='flex flex-col items-center pb-4'>
        <a href='https://github.com/jwseph/youtube-player' className='p-2 active:opacity-50 active:scale-95 duration-100 ease-in-out text-zinc-500'>
          <RiGithubLine className='w-5 h-5'/>
        </a>
      </div>
      <div id='toastWrapper'>
        <ToastContainer
          className='text-sm'
          position="bottom-center"
          autoClose={5000}
          hideProgressBar={false}
          newestOnTop
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="dark"
        />
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
