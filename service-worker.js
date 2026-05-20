<<<<<<< HEAD
self.addEventListener('install', e => self.skipWaiting())

self.addEventListener('fetch', () => {})
=======
const CACHE_NAME =
"ichat-v1";

const urlsToCache = [

  "/",
  "/chat.html",
  "/css/chat.css"

];

self.addEventListener(
  "install",
  (event)=>{

    event.waitUntil(

      caches.open(CACHE_NAME)
      .then((cache)=>{

        return cache.addAll(
          urlsToCache
        );

      })

    );

  }
);

self.addEventListener(
  "fetch",
  (event)=>{

    event.respondWith(

      caches.match(
        event.request
      ).then((response)=>{

        return response ||
        fetch(event.request);

      })

    );

  }
);
>>>>>>> e5a925c5d6c1af47d36f118296cf2b3842f8ecc9
