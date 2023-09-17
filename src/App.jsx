import { useState, useEffect, useRef, useMemo, Fragment } from 'react'
import './App.css'
import { Route, Link, Routes, useNavigate, useParams, matchRoutes } from 'react-router-dom'
import { LazyLoadImage } from 'react-lazy-load-image-component'
import YouTube from 'react-youtube'
// import { MdSkipNext, MdSkipPrevious, MdShuffle, MdPlayArrow, MdPause, MdRepeatOne, MdRepeatOneOn, MdKeyboardArrowDown, MdKeyboardArrowUp } from 'react-icons/md';
import { RiPlayFill, RiPauseFill, RiSkipBackFill, RiSkipForwardFill, RiShuffleFill, RiRepeat2Fill, RiRepeatOneFill, RiArrowDownSFill, RiArrowUpSFill, RiArrowDownSLine, RiArrowLeftSLine, RiMoreLine, RiAddLine, RiGithubLine, RiExternalLinkLine, RiGroupLine, RiPlayListAddLine, RiCloseFill, RiMore2Fill, RiEyeLine, RiEyeOffLine, RiRefreshLine, RiDownloadLine } from "react-icons/ri";
import { GoBroadcast, GoPlus, GoChevronLeft, GoBug } from 'react-icons/go'
import { BugIcon, ChevronDownIcon, ChevronLeftIcon, CodespacesIcon, DownloadIcon, EyeClosedIcon, EyeIcon, FileAddedIcon, KebabHorizontalIcon, LinkExternalIcon, MarkGithubIcon, PasteIcon, PlusCircleIcon, PlusIcon, RedoIcon, ShareAndroidIcon, ShareIcon, SyncIcon } from '@primer/octicons-react'
import LoadingBar from 'react-top-loading-bar'
import { socket } from './socket'
import { ToastContainer, toast } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import { Dialog, Transition } from '@headlessui/react'

const BASE = 'https://kamiak-io.fly.dev/yuu/'

const classNames = (...classes) => classes.filter(Boolean).join(' ');

const getPlaylistId = (url) => new URL(url).searchParams.get('list');

const getVideoId = (url) => {
  if (!url) return url;
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

function blendColors(colorA, colorB, amount) {
  // Source: https://stackoverflow.com/questions/6367010/average-2-hex-colors-together-in-javascript
  const [rA, gA, bA] = colorA.match(/\w\w/g).map((c) => parseInt(c, 16));
  const [rB, gB, bB] = colorB.match(/\w\w/g).map((c) => parseInt(c, 16));
  const r = Math.round(rA+(rB-rA)*amount).toString(16).padStart(2, '0');
  const g = Math.round(gA+(gB-gA)*amount).toString(16).padStart(2, '0');
  const b = Math.round(bA+(bB-bA)*amount).toString(16).padStart(2, '0');
  return '#'+r+g+b;
}

function generateSessionId() {
  let res = '';
  while (res.length < 6) {
    res += '0123456789abcdef'[0|16*Math.random()];
  }
  return res;
}

function SelectPlaylistPage({playlists, syncPlaylists}) {
  useEffect(() => {
    document.title = 'Select a playlist · Yuu';
  }, [])
  useEffect(() => {
    let sync = true;
    let timeout = null;
    function repeat() {
      if (!sync) return;
      syncPlaylists();
      timeout = setTimeout(repeat, 250);
    }
    repeat();
    return () => {
      sync = false;
      clearTimeout(timeout);
    }
  }, [])

  return (
    <div className='w-full grow max-w-3xl py-5 sm:py-8 px-5 sm:px-7 flex flex-col items-center gap-8 mb-8'>
      <div className='w-full flex justify-between items-center text-zinc-200'>
        <div className='flex flex-1 items-center'>
          <Link to={`/s/${generateSessionId()}`} className='flex items-center gap-1 text-red-500 tracking-tight active:opacity-30 duration-100 ease-in-out'>
            <div className='h-8'/>
            <ShareAndroidIcon className='w-6 h-6' size='large'/>
            <div className='hidden sm:block'>Group session</div>
          </Link>
        </div>
        <div>
          <h2 className='text-center font-semibold tracking-tight text-zinc-50'>
            Select a playlist
          </h2>
        </div>
        <div className='flex flex-1 items-center justify-end'>
          <Link to='/import' className='flex items-center gap-1 text-red-500 tracking-tight active:opacity-30 duration-100 ease-in-out'>
            <div className='h-8'/>
            <div className='hidden sm:block'>Import a playlist</div>
            <PlusCircleIcon className='w-6 h-6' size='large'/>
          </Link>
        </div>
      </div>
      <div className='w-full grow flex flex-col justify-center'>
        {!Object.keys(playlists).length ? (
          <div className='text-center text-sm text-zinc-400 flex flex-wrap justify-center gap-1'>
            No playlists yet. Add a playlist to get started
          </div>
        ) : (
          <div className='flex flex-col gap-5 sm:gap-7'>
            {Object.keys(playlists).map(playlistId => {
              let playlist = playlists[playlistId];
              return (
                <div key={playlistId} className={classNames('group relative rounded-lg overflow-clip', !playlist?.queue ? 'cursor-default' : 'cursor-pointer', !playlist?.queue && 'opacity-30', 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600')}>
                  <img src={playlist.thumbnails.small} className='absolute w-full h-full rounded-lg'/>
                  <div className='absolute w-full h-full bg-zinc-900/70 backdrop-blur-3xl'/>
                  <div className='absolute w-full h-full bg-zinc-950 opacity-0 group-active:opacity-70 z-20 duration-100 ease-in-out pointer-events-none'/>
                  <Link to={'/play?list='+playlistId} tabIndex={!playlist?.queue ? '-1' : '0'}
                    className={classNames(
                      'relative items-center w-full px-5 sm:px-7 py-5 sm:py-7 flex gap-5 sm:gap-7 shadow-sm z-10',
                    )}
                  >
                    {/* <div className="aspect-square h-16 sm:h-32 relative bg-gradient-to-tr	from-zinc-900 to-zinc-950 rounded-sm shadow-sm overflow-hidden">
                      <div className="absolute inset-0 bg-cover bg-center z-0 duration-200 ease-in-out" style={{backgroundImage: 'url('+playlist.thumbnails.small+')'}}></div>
                    </div> */}
                    <img src={playlist.thumbnails.small} className='h-16 sm:h-32 aspect-square object-cover rounded-sm'/>
                    <div className='flex flex-col flex-1 items-start gap-1'>
                      <h3 className='text-md text-zinc-50 font-medium text-left truncate'>{playlist.title}</h3>
                      <div className='flex flex-wrap'>
                        <div className='text-sm text-zinc-50'>{playlist.channel}</div>
                        <div className='px-2'></div>
                        {/* {!playlist.queue ? (
                          <div className='text-sm text-zinc-400'>Importing videos...</div>
                        ) : (
                          <div className='text-sm text-zinc-400'>{playlist.queue.length} videos</div>
                        )} */}
                      </div>
                    </div>
                  </Link>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function PlaylistQueue({queue, videos, index, onClick, onRemove}) {
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
              'group relative activeopacity-30 duration-100 ease-in-out mb-px last:mb-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 focus-visible:z-20 sm:rounded-md overflow-clip',
              // index == i ? 'bg-zinc-900' : 'bg-zinc-950',
            )}
            onClick={() => onClick(i)}
          >
            {index == i && <>
              <LazyLoadImage src={video.thumbnails.small} className='absolute w-full h-full bg-zinc-900 opacity-20'/>
              <div className='absolute w-full h-full bg-zinc-900/40 backdrop-blur-2xl'></div>
              <div className='absolute w-full h-full opacity-0 group-active:opacity-70 bg-zinc-950 duration-100 ease-in-out'></div>
            </>}
            <div className='px-5 sm:px-7'>
              <div className='relative flex flex-1 items-center gap-3 z-20 group-active:opacity-30 duration-100 ease-in-out'>
                <div className={classNames('hidden sm:block -ml-5 sm:-ml-7 w-10 text-xs text-right text-zinc-500', index == i && 'sm:text-zinc-400')}>
                  {i+1}
                </div>
                <div className='py-4'>
                  <div className='relative'>
                    <div className={classNames(
                      'absolute bg-zinc-900/50 w-full h-full flex items-center justify-center duration-100',
                      index == i ? 'opacity-100' : 'opacity-0',
                    )}>
                      <RiPlayFill className='w-6 h-6 text-zinc-50/75 drop-shadow-sm'/>
                    </div>
                    <LazyLoadImage
                      className='h-7 aspect-video rounded-sm'
                      src={video.thumbnails.small}
                    />
                  </div>
                </div>
                <div className='py-4 inline-flex flex-col flex-1 truncate'>
                  <h1 className={classNames('truncate text-xs text-left flex-1 text-zinc-300', index == i && 'sm:text-zinc-200')}>{video.title}</h1>
                  <span className={classNames('truncate text-xs text-left text-zinc-500', index == i && 'sm:text-zinc-400')}>{video.channel}</span>
                </div>
                {/* <div className='pl-2 text-xs text-zinc-500 text-left group-hover:hidden'>{i+1}</div> */}
                {onRemove ? (
                  <button
                    className='p-4 hidden group-hover:block translate-x-4'
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemove(i);
                    }}
                  >
                    <RiCloseFill className='text-zinc-500 w-6 h-6'/>
                  </button>
                ) : (
                  <></>
                  // <div className='pl-2 text-xs text-zinc-500 text-left hidden group-hover:block'>{i+1}</div>
                )}
              </div>
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
      className='p-3 text-[var(--darkIconColor)] bg-zinc-50 active:opacity-30 disabled:opacity-50 disabled:scale-100 duration-100 ease-in-out aspect-square rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600'
      onClick={async () => {
        if (changePlaying) {
          changePlaying(playing);
          return;
        }
        setPlaying(!playing);
        await onClick();
      }}
      style={{'--darkIconColor': blendColors('#09090b', color, 0.07)}}
      disabled={!video}
    >
      {!playing ? <RiPlayFill className='w-9 h-9 duration-1000 ease-in-out'/> : <RiPauseFill className='w-9 h-9 duration-1000 ease-in-out'/>}
    </button>
  )
}

function LoopOneButton({loopOne, setLoopOne, video, onLoopOneClick}) {
  return (
    <button className='p-3 -mr-3 text-zinc-50 active:opacity-30 disabled:opacity-50 disabled:scale-100 duration-100 ease-in-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 rounded-sm'
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
        <div className='text-xs font-light'>{video ? formatTime(time|0) : '0:00'}</div>
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
    if (!video) return;
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
          <button className='p-3 -ml-3 text-zinc-50 active:opacity-30 disabled:opacity-50 disabled:scale-100 duration-100 ease-in-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 rounded-sm'
            onClick={shuffle}
            disabled={!video}
          >
            <RiShuffleFill className='w-5 h-5'/>
          </button>
          <div className='flex-1'></div>
          <button className='relative flex items-center justify-center px-3 p-1.5 select-none text-zinc-30 disabled:scale-100 duration-100 ease-in-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 rounded-sm active:opacity-50 disabled:opacity-50 drop-shadow-sm'
            onClick={playPrev}
            disabled={!video}
          >
            {video && getPrev() && <img className='absolute w-16 scale-125 aspect-video opacity-30 ease-in-out rounded-sm' src={getPrev().thumbnails.small}/>}
            <RiSkipBackFill className='w-9 h-9 z-30 drop-shadow-sm'/>
          </button>
          <div className='flex-1 max-w-[3rem]'></div>
          <div className='z-30'>
            <PauseButton addPlayingListener={(callback) => playingCallback.current = callback}
              onClick={togglePlaying}
              color={color}
              video={video}
              changePlaying={changePlaying}
            />
          </div>
          <div className='flex-1 max-w-[3rem]'></div>
          <button className='relative flex items-center justify-center px-3 p-1.5 select-none text-zinc-50 disabled:scale-100 duration-100 ease-in-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 rounded-sm active:opacity-30 disabled:opacity-50 drop-shadow-sm'
            onClick={playNext}
            disabled={!video}
          >
            {video && getNext() && <img className='absolute w-16 scale-125 aspect-video opacity-30 ease-in-out rounded-sm' src={getNext().thumbnails.small}/>}
            <RiSkipForwardFill className='w-9 h-9 z-30 drop-shadow-sm'/>
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

function PlayerPage({playlist, updatePlaylist, resetPlaylist, updatePlaylistLocalStorage, videos, playlistId}) {
  const [queue, setQueue] = useState([...playlist.queue]);
  const [index, setIndex] = useState(playlist.index);
  const [video, setVideo] = useState({...videos[queue[index]]});
  const [color, setColor] = useState('#18181b');
  const playerRef = useRef(null);
  const playingRef = useRef(false);
  const playingCallback = useRef();
  const previousStates = useRef([-2, -2, -2]);
  const [loopOne, setLoopOne] = useState(false);
  const [menu, setMenu] = useState(false);
  const [showRemoved, setShowRemoved] = useState(false);
  const menuCancelRef = useRef(null);
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [])
  useEffect(() => {
    if (!showRemoved) {
      setQueue([...playlist.queue]);
      setIndex(playlist.index);
      return;
    }
    let newQueue = Object.keys(playlist.removedVideoIds);
    setQueue(newQueue);
    setIndex(0);
    setVideo(newQueue?.[0] ?? 0);
  }, [showRemoved])
  useEffect(() => {
    if (!showRemoved) updatePlaylistLocalStorage(queue, index);
    if (!queue.length) {
      setVideo(null);
      playerRef.current.internalPlayer.pauseVideo();
      return;
    }
    setVideo({...videos[queue[index]]});
    playerRef.current.internalPlayer.loadVideoById(queue[index]);
  }, [queue, index, showRemoved])
  useEffect(() => {
    if (!video) {
      setColor('#18181b');
      return;
    }
    document.title = `${playlist.title} · ${video.title} · Yuu`;
    updateColor();
  }, [video])
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
    console.log('updateColor', video)
    let image = video.thumbnails.small;
    let r = await fetch(BASE+'get_color?image_url='+encodeURIComponent(image))
    let newColor = await r.json();
    if (video.thumbnails.small != image) return;
    setColor(newColor+'7a');
  }

  return (
    <div className='w-full flex flex-col items-center'>
      <Transition.Root show={menu} as={Fragment}>
        <Dialog as="div" className="relative z-20" initialFocus={menuCancelRef} onClose={setMenu}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-300"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className='fixed inset-0 bg-zinc-950/20 backdrop-blur-3xl transition-opacity'/>
          </Transition.Child>

          <div className="fixed inset-0 z-20 overflow-y-auto">
            <div className="flex min-h-full items-start justify-center text-center overflow-hidden">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 translate-y-4 lg:translate-y-0 lg:scale-110"
                enterTo="opacity-100 translate-y-0 scale-100"
                leave="ease-in duration-300"
                leaveFrom="opacity-100 translate-y-0 scale-100"
                leaveTo="opacity-0 translate-y-4 lg:translate-y-0 lg:scale-110"
              >
                <Dialog.Panel className="relative transform text-left transition-all py-8 px-5 sm:px-7 w-full h-screen max-w-3xl max-h-[100dvh] flex flex-col pointer-events-none">
                  <div className='flex-4'></div>
                  <div className='flex flex-col items-center space-y-7'>
                    <div className='px-8 flex flex-col items-center'>
                      <img className='w-full h-full max-w-sm rounded-md' src={playlist.thumbnails.large}/>
                    </div>
                    <div className='max-w-full flex flex-col items-center gap-1'>
                      <h2 className='text-zinc-200 text-xl font-semibold tracking-tight truncate max-w-full'>
                        {playlist.title}
                      </h2>
                    </div>
                  </div>
                  <div className='flex-1'></div>
                  <div className='overflow-y-scroll -mx-6 flex flex-col items-start text-md pointer-events-auto' onClick={() => setMenu(false)}>
                    {/* <MenuLink setMenuOpen={setMenuOpen} href='#' text='Top'/> */}
                    {/* <MenuLink setMenuOpen={setMenuOpen} href='#members' text='Members'/> */}
                    <a target='_blank' className='w-full py-3 sm:py-4 px-5 sm:px-7 flex gap-2 items-center active:opacity-30 duration-100 ease-in-out' href={`https://www.youtube.com/watch?v=${getVideoId(video?.video_url)}&list=${playlistId}`}>
                      <LinkExternalIcon size='large' className='text-zinc-400 w-6 h-6'/>
                      <div className='text-zinc-200 flex-1 text-left'>
                        Open in YouTube
                      </div>
                    </a>
                    {showRemoved ? (
                      <button onClick={() => setShowRemoved(false)} className='w-full py-3 sm:py-4 px-5 sm:px-7 flex gap-2 items-center active:opacity-30 duration-100 ease-in-out'>
                        <EyeClosedIcon size='large' className='text-zinc-400 w-6 h-6'/>
                        <div className='text-zinc-200 flex-1 text-left'>
                          Hide removed videos
                        </div>
                      </button>
                    ) : (
                      <button onClick={() => setShowRemoved(true)} className='w-full py-3 sm:py-4 px-5 sm:px-7 flex gap-2 items-center active:opacity-30 duration-100 ease-in-out'>
                        <EyeIcon size='large' className='text-zinc-400 w-6 h-6'/>
                        <div className='text-zinc-200 flex-1 text-left'>
                          View removed videos
                        </div>
                      </button>
                    )}
                    <button className='w-full py-3 sm:py-4 px-5 sm:px-7 flex gap-2 items-center active:opacity-30 duration-100 ease-in-out'
                      onClick={async () => {
                        await updatePlaylist(location.href);
                        location.reload();
                      }}
                    >
                      <DownloadIcon size='large' className='text-zinc-400 w-6 h-6'/>
                      <div className='text-zinc-200 flex-1 text-left'>
                        Update playlist
                      </div>
                    </button>
                    <button className='w-full py-3 sm:py-4 px-5 sm:px-7 flex gap-2 items-center active:opacity-30 duration-100 ease-in-out'
                      onClick={async () => {
                        await resetPlaylist(location.href);
                        location.reload();
                      }}
                    >
                      <SyncIcon size='large' className='text-zinc-400 w-6 h-6'/>
                      <div className='text-zinc-200 flex-1 text-left'>
                        Reset playlist
                      </div>
                    </button>
                  </div>
                  <div className='h-6'></div>
                  <div className='flex-4'></div>
                  <button onClick={() => setMenu(false)} className='pointer-events-auto w-full flex gap-4 items-center active:opacity-30 duration-100 ease-in-out'>
                    <div className='text-zinc-200 flex-1 text-center'>
                      Close
                    </div>
                  </button>
                  <div className='flex-1'></div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition.Root>
      <div className="w-full space-y-8 text-zinc-50">
        <div className='flex flex-col'>
          <div className='relative text-center duration-1000 ease-in-out shadow-sm z-10'>
            <img className='absolute w-full h-[90%] bg-zinc-900' src={video?.thumbnails?.small ?? '/zero.png'}/>
            <div className='text-left z-10 min-h-[100svh] flex flex-col items-center backdrop-blur-3xl bg-gradient-to-b from-zinc-950/20 via-zinc-950/60 to-zinc-950'>
              <div className='max-w-3xl w-full inline-flex flex-1 flex-col z-20'>
                <div className='flex justify-between items-center py-5 sm:py-8 px-5 sm:px-7 gap-4'>
                  <div className='flex flex-1 items-center'>
                    <Link to='/' className='flex items-center gap-1 tracking-tight active:opacity-30 duration-100 ease-in-out'>
                      <ChevronDownIcon className='w-8 h-8' size='large'/>
                    </Link>
                  </div>
                  <h2 className='text-center font-semibold tracking-tight truncate'>
                    {playlist.title}
                  </h2>
                  <div className='flex flex-1 items-center justify-end'>
                    <button onClick={() => setMenu(true)} className='flex items-center gap-1 tracking-tight active:opacity-30 duration-100 ease-in-out'>
                      <KebabHorizontalIcon className='w-6 h-8' size='large'/>
                    </button>
                  </div>
                </div>
                <div className='flex-4 min-h-12'></div>
                <div className='px-10 sm:px-16 md:px-24'>
                  <div id='videoContainer' className='w-full aspect-video rounded-md shadow-2xl overflow-hidden group'>
                    {!video && <div className='w-full h-full bg-zinc-800'>
                      <div className='w-full h-full p-[20%] flex flex-col justify-center items-center text-zinc-700'>
                        <div>
                          No removed videos
                        </div>
                      </div>
                    </div>}
                    {youtubePlayer}
                  </div>
                </div>
                <div className='flex-4 min-h-12'></div>
                <div className='pb-4 px-5 sm:px-7'>
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
                <div className='flex-1'></div>
              </div>
            </div>
          </div>
          <div className='flex flex-col items-center'>
            <div className='max-w-3xl w-full pb-8'>
              <PlaylistQueue queue={queue} videos={videos} index={index} onClick={(i) => setIndex(i)}/>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function SessionPage() {
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
      playerRef.current.internalPlayer.pauseVideo();
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
  const shuffle = () => socket.emit('shuffle', {stream_id: streamId.current});
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
        <div className='flex flex-col'>
          <div className='relative text-center duration-1000 ease-in-out shadow-sm z-10'>
            <img className='absolute w-full h-[90%] bg-zinc-900' src={video?.thumbnails?.small ?? '/zero.png'}/>
            <div className='text-left z-10 min-h-[100svh] flex flex-col items-center backdrop-blur-3xl bg-gradient-to-b from-zinc-950/20 via-zinc-950/60 to-zinc-950'>
              <div className='max-w-3xl w-full inline-flex flex-1 flex-col z-20'>
                <div className='flex justify-between items-center py-5 sm:py-8 px-5 sm:px-7 gap-4'>
                  <div className='flex flex-1 items-center'>
                    <Link to='/' className='flex items-center gap-1 tracking-tight active:opacity-30 duration-100 ease-in-out'>
                      <ChevronDownIcon className='w-8 h-8' size='large'/>
                    </Link>
                  </div>
                  <h2 className='text-center font-semibold tracking-tight truncate'>
                    {displayedStreamId}
                  </h2>
                  <div className='flex flex-1 items-center justify-end'>
                    <button onClick={addItems} className='flex items-center gap-1 tracking-tight active:opacity-30 duration-100 ease-in-out'>
                      <PasteIcon className='w-6 h-8' size='large'/>
                    </button>
                  </div>
                </div>
                <div className='flex-4 min-h-12'></div>
                <div className='px-10 sm:px-16 md:px-24'>
                  <div id='videoContainer' className='w-full aspect-video rounded-md shadow-2xl overflow-hidden group'>
                    {!video && <div className='w-full h-full bg-zinc-800'>
                      <div className='w-full h-full p-[20%] flex flex-col justify-center items-center text-zinc-700'>
                        <div className='text-center'>
                          Press the clipboard icon to add a video
                        </div>
                      </div>
                    </div>}
                    {youtubePlayer}
                  </div>
                </div>
                <div className='flex-4 min-h-12'></div>
                <div className='pb-4 px-5 sm:px-7'>
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
                <div className='flex-1'></div>
              </div>
            </div>
          </div>
          <div className='flex flex-col items-center'>
            <div className='max-w-3xl w-full pb-8'>
              <PlaylistQueue queue={playback.queue} videos={videos} index={playback.index}
                onClick={(i) => {
                  socket.emit('select_video', {
                    stream_id: streamId.current,
                    video_id: playback.queue[i],
                  })
                }}
                onRemove={(i) => {
                  socket.emit('remove_video', {
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

// function PlayerSwitcher({playlists, setPlaylists, syncPlaylists, changePlayerCount}) {
//   const [playlist, setPlaylist] = useState(null);
//   useEffect(() => {
//     document.title = 'Select a playlist · Yuu';
//   }, [])
//   useEffect(() => {
//     if (!playlist) return;
//     setPlaylists((playlists) => ({
//       ...playlists,
//       [getPlaylistId(playlist.url)]: playlist,
//     }))
//   }, [playlist])
//   return (
//     !playlist?.queue ? (
//       <SelectPlaylistPage playlists={playlists} syncPlaylists={syncPlaylists}/>
//     ) : (
//       <PlayerPage playlist={playlist} videos={videos} playlistId={getPlaylistId(playlist.url)}
//         updatePlaylistLocalStorage={(queue, index) => {
//           setPlaylist({...playlist, queue, index});
//         }}
//       />
//     )
//   )
// }

function PlaylistLoadingPage({setPlaylists, updatePlaylist, resetPlaylist, loadPlaylistVideos}) {
  const [playlist, setPlaylist] = useState(null);
  const [videos, setVideos] = useState();
  const loading = useRef(false);
  const [progress, setProgress] = useState(0);
  const [image, setImage] = useState('');
  const requestedImage = useRef(false);

  useEffect(() => {
    if (requestedImage.current) return;
    requestedImage.current = true;
    (async () => {
      const genres = ['kick', 'happy', 'wink', 'poke', 'dance', 'cringe'];
      let genre = genres[0|genres.length*Math.random()];
      let resp = await fetch('https://api.waifu.pics/sfw/'+genre);
      let data = await resp.json();
      setImage(data.url);
    })();
  }, [])

  useEffect(() => {
    if (playlist || loading.current) return;
    (async () => {
      loading.current = true;
      const data = await loadPlaylistVideos(location.href, setProgress);
      console.log(data);
      setPlaylist(data.playlist);
      setVideos(data.videos);
    })();
  }, [playlist, videos]);

  useEffect(() => {
    if (!playlist) return;
    console.log('setting playlists');
    setPlaylists((playlists) => ({
      ...playlists,
      [getPlaylistId(playlist.url)]: playlist,
    }))
  }, [playlist])

  return (
    <div className='w-full flex justify-center'>
      <LoadingBar color='#ff0000' progress={progress}/>
      {!playlist ? (
        <div className='p-16 flex flex-col items-center gap-8'>
          <img src={image} className='w-full bg-transparent'/>
          <div className='text-md'>(Loading playlist items, please wait...)</div>
        </div>
      ) : (
        <PlayerPage
          playlist={playlist}
          videos={videos}
          playlistId={getPlaylistId(playlist.url)}
          updatePlaylist={updatePlaylist}
          resetPlaylist={resetPlaylist}
          updatePlaylistLocalStorage={(queue, index) => {
            console.log('updatePlaylistLocalStorage');
            setPlaylist({...playlist, queue, index});
          }}
        />
      )}
    </div>
  )
}

function ImportPage({updatePlaylist, resetPlaylist}) {
  const navigate = useNavigate();
  const [playlistUrl, setPlaylistUrl] = useState()
  useEffect(() => {
    document.title = 'Import a playlist · Yuu';
  }, [])
  return (
    <div className='w-full grow max-w-3xl flex flex-col py-5 sm:py-8 px-5 sm:px-7 gap-8 mb-8'>
      <div className='flex justify-between items-center'>
        <div className='flex flex-1 items-center'>
          <Link to='/' className='flex items-center gap-1 text-red-500 tracking-tight active:opacity-30 duration-100 ease-in-out'>
            <div className='h-8'/>
            <ChevronLeftIcon className='w-8 h-8 -mx-2' size='large'/>
          </Link>
        </div>
        <div>
          <h2 className='text-center font-semibold tracking-tight'>
            Import a playlist
          </h2>
        </div>
        <div className='flex-1'></div>
      </div>
      <form className='w-full grow flex flex-col justify-center gap-8 mt-8 text-md' onSubmit={e => e.preventDefault()}>
        <div className="-space-y-1 rounded-sm shadow-lg">
          <div className='flex px-4 py-2.5 gap-4 bg-zinc-900 rounded-lg leading-6'>
            <label htmlFor='playlistUrl' className='text-zinc-200 whitespace-nowrap'>URL</label>
            <input autoFocus onChange={e => setPlaylistUrl(e.target.value.trim())} id="playlistUrl" name="playlistUrl" type="text" autoComplete="off" size="1" className="flex-1 border-0 bg-transparent p-0 text-zinc-200 placeholder:text-zinc-700 focus:z-20" placeholder='Enter a YouTube playlist URL'/>
          </div>
        </div>
        <div className='grid gap-7 sm:grid-cols-2'>
          <div className='flex-1 space-y-3'>
            <button className="relative flex w-full justify-center rounded-lg bg-red-600 py-2.5 px-3 font-medium text-zinc-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 active:opacity-30 duration-100 ease-in-out"
              onClick={async () => {
                console.log('updating...');
                await updatePlaylist(playlistUrl);
                navigate('/');
              }}
            >
              Add / Update
            </button>
            <div className='space-y-2'>
              <p className='px-4 text-xs text-zinc-500'>
                Add a new playlist or update an existing one.
              </p>
              <p className='px-4 text-xs text-zinc-500'>
                The playlist must be public.
              </p>
            </div>
          </div>
          <div className='flex-1 space-y-3'>
            <button className="relative flex w-full justify-center rounded-lg bg-zinc-300 py-2.5 px-3 font-medium text-zinc-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 active:opacity-30 duration-100 ease-in-out"
              onClick={async () => {
                await resetPlaylist(playlistUrl);
                navigate('/');
              }}
            >
              Reset
            </button>
            <div className='space-y-2'>
              <p className='px-4 text-xs text-zinc-500'>
                Fully reset a playlist.
              </p>
              <p className='px-4 text-xs text-zinc-500'>
                This is slower than "Add / Update" because it resets the data of existing videos as well as untracked videos.
              </p>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}

function App() {
  const [playlists, setPlaylists] = useState(JSON.parse(localStorage.playlists || '{}'))

  useEffect(() => {
    (async () => {
      for (const playlistId in playlists) {
        await updatePlaylistInfo(playlistId);
      }
    })();
  }, [])

  async function syncPlaylist(playlistId) {
    const playlist = {...playlists[playlistId]};
    playlist.queue = playlist.queue ?? [];
    let indexVideoId = playlist.queue[playlist.index ?? 0] ?? '';
    let resp = await fetch(BASE+'get_video_ids?playlist_id='+playlistId);
    let {videoIds, removedVideoIds} = await resp.json();
    if (videoIds == null) return;
    removedVideoIds = removedVideoIds ?? {};

    let newVideoIds = {...videoIds};
    for (const videoId of playlist.queue) {
      delete newVideoIds[videoId];
    }
    playlist.queue = Object.keys(newVideoIds).concat(playlist.queue);
    // Filter by `not in removedVideoIds` instead of `in videoIds` as a safety in case videoId was removed from videoIds but not added to removedVideoIds.
    playlist.queue = playlist.queue.filter((videoId) => !removedVideoIds?.[videoId]);
    playlist.index = Math.max(0, playlist.queue.indexOf(indexVideoId));
    playlist.videoIds = videoIds;
    playlist.removedVideoIds = removedVideoIds;
    setPlaylists((playlists) => ({...playlists, [playlistId]: playlist}));
  }

  async function syncPlaylists() {
    console.log('syncing...')
    for (let playlistId in playlists) {
      await syncPlaylist(playlistId);
    }
  }

  useEffect(() => {
    console.log('playlists changed!!!')
    localStorage.playlists = JSON.stringify(playlists);
  }, [playlists])

  async function updatePlaylistInfo(playlistId) {
    let resp = await fetch(BASE+'get_playlist_info?playlist_id='+playlistId);
    let playlist = await resp.json();
    setPlaylists({...playlists, [playlistId]: {...playlists[playlistId] ?? {}, ...playlist}});
  }

  async function updatePlaylist(playlistUrl) {
    let playlistId = getPlaylistId(playlistUrl);
    await updatePlaylistInfo(playlistId);
    await fetch(BASE+'update?playlist_id='+playlistId, {method: 'POST'});
  }

  async function resetPlaylist(playlistUrl) {
    let playlistId = getPlaylistId(playlistUrl);
    await updatePlaylistInfo(playlistId);
    await fetch(BASE+'import?playlist_id='+playlistId, {method: 'POST'});
  }

  async function loadPlaylistVideos(playlistUrl, setProgress) {
    console.log('LOAD PLAYLIST VIDEOS')
    let playlistId = getPlaylistId(playlistUrl);
    setProgress?.(20);
    if (!playlists[playlistId]) {
      await updatePlaylistInfo(playlistId);
      setProgress?.(40);
      await updatePlaylist(playlistUrl);
      setProgress?.(60);
      await syncPlaylist(playlistId);
    }
    setProgress?.(80);
    let resp = await fetch(BASE+'get_playlist_videos?playlist_id='+playlistId);
    const videos = await resp.json();
    setProgress?.(100);
    console.log('DONE LOADING PLAYLIST VIDEOS')
    return {playlist: playlists[playlistId], videos};
  }

  return (
    <div className="flex flex-col min-h-full items-center justify-center bg-zinc-950 selection:bg-zinc-300/25 selection:text-zinc-50">
      <div className='w-full grow flex flex-col min-h-full items-center justify-center'>
        <Routes>
          <Route path='/' element={<SelectPlaylistPage playlists={playlists} syncPlaylists={syncPlaylists}/>}></Route>
          <Route path='/play' element={<PlaylistLoadingPage setPlaylists={setPlaylists} updatePlaylist={updatePlaylist} resetPlaylist={resetPlaylist} loadPlaylistVideos={loadPlaylistVideos}/>}></Route>
          <Route path='/import' element={<ImportPage updatePlaylist={updatePlaylist} resetPlaylist={resetPlaylist}/>}></Route>
          <Route path='/s' element={<SessionPage/>}></Route>
          <Route path='/s/:session' element={<SessionPage/>}></Route>
        </Routes>
      </div>
      <div className='flex flex-col items-center pb-4'>
        <a href='https://github.com/jwseph/youtube-player' className='p-2 active:opacity-30 duration-100 ease-in-out text-zinc-800'>
          <MarkGithubIcon className='w-6 h-6'/>
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
    </div>
  )
}

export default App
