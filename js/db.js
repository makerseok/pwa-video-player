const dbName = 'ReportsDB';
const dbVersion = 5;

let db = new Dexie(dbName);

db.version(dbVersion).stores({
  reports: '++,PLAY_ON',
  caches: '++id,cachedOn',
  deviceIds: '++,deviceId',
});
