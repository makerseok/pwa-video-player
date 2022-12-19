const dbName = 'ReportsDB';
const dbVersion = 10;

let db = new Dexie(dbName);

db.version(dbVersion).stores({
  reports: '++,PLAY_ON',
  caches: '++id,cachedOn,deviceId,[cachedOn+deviceId]',
  deviceIds: '++,deviceId',
  websockets: '++,event,uuid,[event+uuid]',
});
