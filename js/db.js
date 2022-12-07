const dbName = 'ReportsDB';
const dbVersion = 9;

let db = new Dexie(dbName);

db.version(dbVersion).stores({
  reports: '++,PLAY_ON',
  caches: '++id,cachedOn',
  deviceIds: '++,deviceId',
  websockets: '++,event,uuid,[event+uuid]',
});
