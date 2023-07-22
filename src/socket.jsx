import { io } from 'socket.io-client'

export const socket = io('https://kamiak-io.fly.dev', {path: '/yuu_share/socket.io'});
window.socket = socket;