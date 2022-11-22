const dbName = 'ReportsDB';
const dbVersion = 1;

let db = new Dexie(dbName);

db.version(dbVersion).stores({
  reports:
    '++id,COMPANY_ID,DEVICE_ID,FILE_ID,HIVESTACK_YN,HIVESTACK_URL,PLAY_ON',
});
