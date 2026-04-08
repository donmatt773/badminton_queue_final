import Pusher from 'pusher';
import { PUSHER_CHANNEL, PUSHER_EVENTS } from '@/lib/pusherEvents';

export { PUSHER_CHANNEL, PUSHER_EVENTS };

let pusherServer;

function getPusherServer() {
  if (pusherServer) {
    return pusherServer;
  }

  const appId = process.env.PUSHER_APP_ID;
  const key = process.env.PUSHER_KEY;
  const secret = process.env.PUSHER_SECRET;
  const cluster = process.env.PUSHER_CLUSTER;

  if (!appId || !key || !secret || !cluster) {
    throw new Error('Pusher server environment variables are not fully defined.');
  }

  pusherServer = new Pusher({
    appId,
    key,
    secret,
    cluster,
    useTLS: true,
  });

  return pusherServer;
}

const pusherServerProxy = {
  trigger(...args) {
    return getPusherServer().trigger(...args);
  },
};

export default pusherServerProxy;
