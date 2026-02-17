"use client";

import Echo from "laravel-echo";
import Pusher from "pusher-js";

if (typeof window !== "undefined") {
  (window as any).Pusher = Pusher;
  Pusher.logToConsole = true;
}

let echoInstance: Echo<"pusher"> | null = null;

export function getEcho(): Echo<"pusher"> | null {

  if (typeof window === "undefined") return null;

  if (!echoInstance) {

    echoInstance = new Echo<"pusher">({

      broadcaster: "pusher",

      key: process.env.NEXT_PUBLIC_PUSHER_KEY || "local",

      cluster: "mt1",

      wsHost: process.env.NEXT_PUBLIC_WS_HOST || "127.0.0.1",

      wsPort: Number(process.env.NEXT_PUBLIC_WS_PORT) || 6001,

      wssPort: Number(process.env.NEXT_PUBLIC_WS_PORT) || 6001,

      forceTLS: false,

      disableStats: true,

      enabledTransports: ["ws"],

    });

  }

  return echoInstance;

}