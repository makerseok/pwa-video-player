const dbName = 'recipes';
const dbVersion = 1;
const request = indexedDB.open(dbName, dbVersion);
let db;

request.onupgradeneeded = evt => {
  db = request.result;

  const objectStore = db.createObjectStore('recipe', {
    keyPath: 'id',
    autoIncrement: true,
  });
  objectStore.createIndex('name', 'name', { unique: false });
  objectStore.createIndex('ingredients', 'ingredients', { unique: false });
};

request.onsuccess = evt => {
  db = request.result;

  const transaction = db.transaction('recipe');
  transaction.objectStore('recipe').getAll().onsuccess = evt => {
    evt.target.result.forEach(values => {
      const { id, ...data } = values;
      renderRecipe(data, id);
    });
  };
};

request.error = evt => {
  alert('db error: ' + evt.target.errorCode);
};

// delete a recipe
const deleteRecipe = (key, onsuccess = () => {}) => {
  const request = db
    .transaction('recipe', 'readwrite')
    .objectStore('recipe')
    .delete(key);

  request.onsuccess = () => {
    console.log(`recipe deleted: ${key}`);
    onsuccess();
  };

  request.onerror = err => {
    console.error(`Error: ${err}`);
  };
};
