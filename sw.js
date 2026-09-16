'use strict';

/* ===================================================================
   さんすうチャレンジ / オフラインキャッシュ用サービスワーカー
   ※ このファイルは今回のプロジェクト用に新規で書き起こしたものです。
      元サイトの sw.js とは中身が異なる可能性があります。
   =================================================================== */

var CACHE_NAME = 'sansuu-challenge-v1';

var CORE_FILES = [
  './',
  './index.html',
  './stats.html',
  './manifest.webmanifest',
  './icon-180.png'
];

self.addEventListener('install', function(event){
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache){ return cache.addAll(CORE_FILES); })
      .catch(function(){ /* 1つ失敗しても致命的にしない */ })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function(event){
  event.waitUntil(
    caches.keys().then(function(names){
      return Promise.all(
        names
          .filter(function(name){ return name !== CACHE_NAME; })
          .map(function(name){ return caches.delete(name); })
      );
    })
  );
  self.clients.claim();
});

/* キャッシュ優先、なければネット、取得できたら次回用に保存しておく */
self.addEventListener('fetch', function(event){
  if(event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(function(cached){
      var network = fetch(event.request).then(function(response){
        if(response && response.ok){
          var copy = response.clone();
          caches.open(CACHE_NAME).then(function(cache){ cache.put(event.request, copy); });
        }
        return response;
      }).catch(function(){ return cached; });

      return cached || network;
    })
  );
});
