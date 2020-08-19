require('fake-indexeddb/auto');

const Dexie = require('dexie');
require('dexie-export-import');

const nacl = require('tweetnacl');

const {
    encryptDatabase,
    clearAllTables,
    clearEncryptedTables,
    cryptoOptions,
} = require('../src/index');
const keyPair = nacl.sign.keyPair.fromSeed(new Uint8Array(32));

describe.skip('Upgrades', () => {
    it('should upgrade', async () => {
        const db = new Dexie('upgrade-db');
        encryptDatabase(
            db,
            keyPair.publicKey,
            {
                friends: {
                    type: cryptoOptions.UNENCRYPTED_LIST,
                    fields: ['street'],
                },
            },
            clearAllTables,
            new Uint8Array(24)
        );

        // Declare tables, IDs and indexes
        db.version(1).stores({
            friends: '++id, name, age',
        });

        await db.open();

        const original = {
            name: 'Camilla',
            age: 25,
            street: 'East 13:th Street',
            picture: 'camilla.png',
        };

        await db.friends.add(original);

        await db.close();

        const upgraded = new Dexie('upgrade-db');
        encryptDatabase(
            upgraded,
            keyPair.publicKey,
            {
                friends: {
                    type: cryptoOptions.UNENCRYPTED_LIST,
                    fields: ['picture'],
                },
            },
            clearAllTables,
            new Uint8Array(24)
        );

        upgraded.version(1).stores({
            friends: '++id, name, age',
        });

        await upgraded.open();

        const readingDb = new Dexie('upgrade-db');
        readingDb.version(1).stores({
            friends: '++id, name, age',
        });
        encryptDatabase(
            readingDb,
            keyPair.publicKey,
            {
                friends: cryptoOptions.NON_INDEXED_FIELDS,
            },
            clearAllTables,
            new Uint8Array(24)
        );
        await readingDb.open();
        const out = await readingDb.friends.get(1);

        expect(out).toEqual({ ...original, id: 1 });
    });
});
