import { readFileSync } from 'node:fs';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  type DocumentData,
  type Firestore,
} from 'firebase/firestore';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';

const ALICE = 'alice'; // trip creator
const BOB = 'bob'; // collaborator on Alice's trip
const CAROL = 'carol'; // another collaborator on Alice's trip
const MALLORY = 'mallory'; // signed in, but a member of nothing

const ALICE_EMAIL = 'Alice@Example.com';
const MALLORY_EMAIL = 'mallory@example.com';

const TRIP = 'trips/tokyo';
const ITEMS = `${TRIP}/shoppingList`;
const ITEM = `${ITEMS}/kitkat`;

let testEnv: RulesTestEnvironment;

// Test contexts hand out compat Firestore instances, which the modular API accepts at runtime.
function asUser(uid: string, email?: string): Firestore {
  return testEnv.authenticatedContext(uid, email ? { email } : undefined).firestore() as unknown as Firestore;
}

function asGuest(): Firestore {
  return testEnv.unauthenticatedContext().firestore() as unknown as Firestore;
}

async function seed(docs: Record<string, DocumentData>): Promise<void> {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore() as unknown as Firestore;
    await Promise.all(Object.entries(docs).map(([path, data]) => setDoc(doc(db, path), data)));
  });
}

const at = (iso: string) => Timestamp.fromDate(new Date(iso));

function tripDoc(overrides: DocumentData = {}): DocumentData {
  return {
    name: 'Tokyo in spring',
    destination: 'Tokyo',
    budget: 150000,
    budgetCurrency: 'JPY',
    startDate: at('2027-04-01T00:00:00Z'),
    endDate: at('2027-04-10T00:00:00Z'),
    locations: [{ name: 'Tokyo', currency: 'JPY' }],
    categories: [],
    owners: [ALICE, BOB, CAROL],
    createdBy: ALICE,
    createdAt: at('2026-11-01T00:00:00Z'),
    updatedAt: at('2026-11-01T00:00:00Z'),
    ...overrides,
  };
}

function itemDoc(overrides: DocumentData = {}): DocumentData {
  return {
    name: 'Matcha KitKat',
    quantity: 2,
    price: 600,
    currency: 'JPY',
    purchased: false,
    createdAt: at('2026-11-02T00:00:00Z'),
    updatedAt: at('2026-11-02T00:00:00Z'),
    ...overrides,
  };
}

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'demo-shopsmart',
    firestore: {
      rules: readFileSync(new URL('../../firestore.rules', import.meta.url), 'utf8'),
      host: '127.0.0.1',
      port: 8080,
    },
  });
});

afterAll(async () => {
  await testEnv?.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
});

describe('exchangeRates', () => {
  const RATES = 'exchangeRates/2026-11-05';

  beforeEach(async () => {
    await seed({
      [RATES]: { base: 'USD', rates: { USD: 1, EUR: 0.92, JPY: 152.3 }, updatedAt: at('2026-11-05T00:00:00Z') },
    });
  });

  it('lets signed-in users read the latest rates', async () => {
    const db = asUser(MALLORY);
    await assertSucceeds(getDocs(query(collection(db, 'exchangeRates'), orderBy('updatedAt', 'desc'), limit(1))));
    await assertSucceeds(getDoc(doc(db, RATES)));
  });

  it('denies reads to signed-out visitors', async () => {
    await assertFails(getDoc(doc(asGuest(), RATES)));
  });

  it('denies all client writes, including a far-future doc that would win the newest-doc query', async () => {
    const db = asUser(MALLORY);
    await assertFails(
      setDoc(doc(db, 'exchangeRates/2099-12-31'), {
        base: 'USD',
        rates: { USD: 1, EUR: 0.0001 },
        updatedAt: at('2099-12-31T00:00:00Z'),
      }),
    );
    await assertFails(updateDoc(doc(db, RATES), { 'rates.EUR': 0.0001 }));
    await assertFails(deleteDoc(doc(db, RATES)));
  });
});

describe('users (private account records)', () => {
  const aliceUser = {
    uid: ALICE,
    email: ALICE_EMAIL,
    emailLower: ALICE_EMAIL.toLowerCase(),
    displayName: 'Alice',
    photoURL: 'https://example.com/alice.png',
  };

  it('lets a user write and read their own doc', async () => {
    const db = asUser(ALICE, ALICE_EMAIL);
    await assertSucceeds(setDoc(doc(db, 'users', ALICE), { ...aliceUser, updatedAt: serverTimestamp() }, { merge: true }));
    await assertSucceeds(setDoc(doc(db, 'users', ALICE), { displayName: 'Alice A.', updatedAt: serverTimestamp() }, { merge: true }));
    await assertSucceeds(getDoc(doc(db, 'users', ALICE)));
  });

  it("denies reading another user's doc", async () => {
    await seed({ [`users/${ALICE}`]: aliceUser });
    await assertFails(getDoc(doc(asUser(MALLORY, MALLORY_EMAIL), 'users', ALICE)));
  });

  it('denies listing users or querying them by email', async () => {
    await seed({ [`users/${ALICE}`]: aliceUser });
    const db = asUser(MALLORY, MALLORY_EMAIL);
    await assertFails(getDocs(collection(db, 'users')));
    await assertFails(getDocs(query(collection(db, 'users'), where('email', '==', ALICE_EMAIL))));
  });

  it("denies writing another user's doc", async () => {
    await seed({ [`users/${ALICE}`]: aliceUser });
    const db = asUser(MALLORY, MALLORY_EMAIL);
    await assertFails(setDoc(doc(db, 'users', ALICE), { displayName: 'pwned' }, { merge: true }));
    await assertFails(deleteDoc(doc(db, 'users', ALICE)));
  });

  it('denies claiming a uid or email that is not in your own auth token', async () => {
    const db = asUser(MALLORY, MALLORY_EMAIL);
    const ref = doc(db, 'users', MALLORY);
    const mallory = { uid: MALLORY, email: MALLORY_EMAIL, emailLower: MALLORY_EMAIL };
    await assertFails(setDoc(ref, { ...mallory, emailLower: 'alice@example.com' }));
    await assertFails(setDoc(ref, { ...mallory, email: ALICE_EMAIL }));
    await assertFails(setDoc(ref, { ...mallory, uid: ALICE }));
    await assertSucceeds(setDoc(ref, mallory));
  });
});

describe('profiles (public cards)', () => {
  const PROFILE = `profiles/${ALICE}`;

  beforeEach(async () => {
    await seed({ [PROFILE]: { displayName: 'Alice', photoURL: 'https://example.com/alice.png', updatedAt: at('2026-11-01T00:00:00Z') } });
  });

  it('lets any signed-in user get a single profile', async () => {
    await assertSucceeds(getDoc(doc(asUser(MALLORY), PROFILE)));
  });

  it('denies signed-out reads', async () => {
    await assertFails(getDoc(doc(asGuest(), PROFILE)));
  });

  it('denies listing profiles', async () => {
    await assertFails(getDocs(collection(asUser(MALLORY), 'profiles')));
  });

  it('lets the owner create and update their card with display fields', async () => {
    await assertSucceeds(
      setDoc(doc(asUser(BOB), 'profiles', BOB), { displayName: 'Bob', photoURL: 'https://example.com/bob.png', updatedAt: serverTimestamp() }),
    );
    await assertSucceeds(
      setDoc(doc(asUser(ALICE), PROFILE), { displayName: 'x'.repeat(200), updatedAt: serverTimestamp() }, { merge: true }),
    );
  });

  it('denies keys other than displayName, photoURL and updatedAt', async () => {
    const db = asUser(ALICE, ALICE_EMAIL);
    await assertFails(setDoc(doc(db, PROFILE), { displayName: 'Alice', email: ALICE_EMAIL }));
    await assertFails(updateDoc(doc(db, PROFILE), { email: ALICE_EMAIL }));
  });

  it('denies oversized or non-string display fields', async () => {
    const db = asUser(ALICE);
    await assertFails(updateDoc(doc(db, PROFILE), { displayName: 'x'.repeat(201) }));
    await assertFails(updateDoc(doc(db, PROFILE), { displayName: 42 }));
    await assertFails(updateDoc(doc(db, PROFILE), { photoURL: `https://example.com/${'a'.repeat(2000)}` }));
  });

  it("denies writing someone else's card", async () => {
    const db = asUser(MALLORY);
    await assertFails(setDoc(doc(db, PROFILE), { displayName: 'pwned' }));
    await assertFails(setDoc(doc(db, 'profiles', BOB), { displayName: 'pwned' }));
    await assertFails(deleteDoc(doc(db, PROFILE)));
  });

  it('lets the owner delete their card', async () => {
    await assertSucceeds(deleteDoc(doc(asUser(ALICE), PROFILE)));
  });
});

describe('trips', () => {
  beforeEach(async () => {
    await seed({ [TRIP]: tripDoc() });
  });

  it('lets members read the trip', async () => {
    const db = asUser(BOB);
    await assertSucceeds(getDoc(doc(db, TRIP)));
    await assertSucceeds(getDocs(query(collection(db, 'trips'), where('owners', 'array-contains', BOB))));
  });

  it('denies non-members reading or editing the trip', async () => {
    const db = asUser(MALLORY);
    await assertFails(getDoc(doc(db, TRIP)));
    await assertFails(updateDoc(doc(db, TRIP), { name: 'pwned' }));
  });

  it('lets a user create a trip they own', async () => {
    const trip = tripDoc({ owners: [MALLORY], createdBy: MALLORY, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
    await assertSucceeds(setDoc(doc(asUser(MALLORY), 'trips/mallory-trip'), trip));
  });

  it('denies creating a trip on behalf of someone else', async () => {
    await assertFails(setDoc(doc(asUser(MALLORY), 'trips/fake'), tripDoc({ owners: [MALLORY], createdBy: ALICE })));
  });

  it('lets the creator delete the trip', async () => {
    await assertSucceeds(deleteDoc(doc(asUser(ALICE), TRIP)));
  });

  it('denies collaborators deleting the trip', async () => {
    await assertFails(deleteDoc(doc(asUser(BOB), TRIP)));
  });

  it('lets collaborators edit trip details', async () => {
    await assertSucceeds(
      updateDoc(doc(asUser(BOB), TRIP), { name: 'Tokyo & Kyoto', budget: 200000, updatedAt: serverTimestamp() }),
    );
  });

  it('still validates budget, name and destination', async () => {
    const db = asUser(BOB);
    await assertFails(updateDoc(doc(db, TRIP), { budget: -1 }));
    await assertFails(updateDoc(doc(db, TRIP), { name: '' }));
    await assertFails(updateDoc(doc(db, TRIP), { destination: 'x'.repeat(201) }));
  });

  it('denies a collaborator removing the creator', async () => {
    const db = asUser(BOB);
    await assertFails(updateDoc(doc(db, TRIP), { owners: [BOB, CAROL] }));
    await assertFails(updateDoc(doc(db, TRIP), { owners: arrayRemove(ALICE) }));
  });

  it('denies a collaborator adding a uid', async () => {
    await assertFails(updateDoc(doc(asUser(BOB), TRIP), { owners: arrayUnion(MALLORY), updatedAt: serverTimestamp() }));
  });

  it('denies a collaborator removing another collaborator', async () => {
    await assertFails(updateDoc(doc(asUser(BOB), TRIP), { owners: arrayRemove(CAROL) }));
  });

  it('lets a collaborator leave', async () => {
    await assertSucceeds(updateDoc(doc(asUser(BOB), TRIP), { owners: arrayRemove(BOB), updatedAt: serverTimestamp() }));
  });

  it('denies leaving while changing anything besides owners and updatedAt', async () => {
    await assertFails(updateDoc(doc(asUser(BOB), TRIP), { owners: arrayRemove(BOB), name: 'Bye' }));
  });

  it('lets the creator remove a collaborator', async () => {
    await assertSucceeds(updateDoc(doc(asUser(ALICE), TRIP), { owners: arrayRemove(BOB), updatedAt: serverTimestamp() }));
  });

  it('lets the creator add a uid', async () => {
    await assertSucceeds(updateDoc(doc(asUser(ALICE), TRIP), { owners: arrayUnion(MALLORY), updatedAt: serverTimestamp() }));
  });

  it('denies the creator removing themselves', async () => {
    await assertFails(updateDoc(doc(asUser(ALICE), TRIP), { owners: [BOB, CAROL] }));
  });

  it('denies changing createdBy', async () => {
    await assertFails(updateDoc(doc(asUser(BOB), TRIP), { createdBy: BOB }));
    await assertFails(updateDoc(doc(asUser(ALICE), TRIP), { createdBy: BOB }));
  });

  it('limits owners to 1-20 string uids', async () => {
    const db = asUser(ALICE);
    const friends = Array.from({ length: 19 }, (_, i) => `friend-${i}`);
    await assertSucceeds(updateDoc(doc(db, TRIP), { owners: [ALICE, ...friends] }));
    await assertFails(updateDoc(doc(db, TRIP), { owners: [ALICE, ...friends, 'one-too-many'] }));
    await assertFails(updateDoc(doc(db, TRIP), { owners: [ALICE, 42] }));
  });
});

describe('trips/{tripId}/shoppingList', () => {
  const LEGACY_IMAGE = 'http://images.example.com/kitkat.jpg';
  const STORAGE_IMAGE = 'https://firebasestorage.googleapis.com/v0/b/demo/o/images%2Fbob%2Fkitkat%2Foriginal?alt=media';

  const newItem = (overrides: DocumentData = {}) =>
    itemDoc({ createdAt: serverTimestamp(), updatedAt: serverTimestamp(), ...overrides });

  beforeEach(async () => {
    await seed({ [TRIP]: tripDoc(), [ITEM]: itemDoc() });
  });

  it('lets members create and read items', async () => {
    const db = asUser(BOB);
    await assertSucceeds(setDoc(doc(db, `${ITEMS}/onigiri`), newItem({ name: 'Onigiri' })));
    await assertSucceeds(getDoc(doc(db, ITEM)));
  });

  it('denies non-members', async () => {
    const db = asUser(MALLORY);
    await assertFails(setDoc(doc(db, `${ITEMS}/onigiri`), newItem({ name: 'Onigiri' })));
    await assertFails(getDoc(doc(db, ITEM)));
  });

  it('denies quantity 0', async () => {
    await assertFails(setDoc(doc(asUser(BOB), `${ITEMS}/onigiri`), newItem({ quantity: 0 })));
  });

  it('denies a javascript: imageUrl', async () => {
    await assertFails(setDoc(doc(asUser(BOB), `${ITEMS}/evil`), newItem({ imageUrl: 'javascript:alert(document.cookie)' })));
  });

  it('denies imageUrls that are not https on create', async () => {
    const db = asUser(BOB);
    await assertFails(setDoc(doc(db, `${ITEMS}/plain`), newItem({ imageUrl: LEGACY_IMAGE })));
    await assertFails(setDoc(doc(db, `${ITEMS}/inline`), newItem({ imageUrl: 'data:image/png;base64,AAAA' })));
  });

  it('allows an https imageUrl and an http(s) productUrl', async () => {
    const db = asUser(BOB);
    await assertSucceeds(
      setDoc(doc(db, `${ITEMS}/secure`), newItem({ imageUrl: STORAGE_IMAGE, productUrl: 'https://shop.example.com/kitkat' })),
    );
    await assertSucceeds(setDoc(doc(db, `${ITEMS}/plain`), newItem({ productUrl: 'http://shop.example.com/kitkat' })));
  });

  it('denies a javascript: productUrl', async () => {
    await assertFails(setDoc(doc(asUser(BOB), `${ITEMS}/evil`), newItem({ productUrl: 'javascript:alert(1)' })));
  });

  it('allows an update that removes imageUrl', async () => {
    await seed({ [ITEM]: itemDoc({ imageUrl: STORAGE_IMAGE }) });
    await assertSucceeds(updateDoc(doc(asUser(BOB), ITEM), { imageUrl: deleteField(), updatedAt: serverTimestamp() }));
  });

  it('allows updating other fields on a legacy doc with an http imageUrl', async () => {
    await seed({ [ITEM]: itemDoc({ imageUrl: LEGACY_IMAGE }) });
    const db = asUser(BOB);
    await assertSucceeds(updateDoc(doc(db, ITEM), { purchased: true, updatedAt: serverTimestamp() }));
    // The edit form re-sends the unchanged imageUrl along with the other fields
    await assertSucceeds(updateDoc(doc(db, ITEM), { imageUrl: LEGACY_IMAGE, notes: 'Get the big box' }));
  });

  it('denies changing a URL to an unsafe value', async () => {
    const db = asUser(BOB);
    await assertFails(updateDoc(doc(db, ITEM), { imageUrl: 'javascript:alert(1)' }));
    await assertFails(updateDoc(doc(db, ITEM), { imageUrl: LEGACY_IMAGE }));
    await assertFails(updateDoc(doc(db, ITEM), { productUrl: 'javascript:alert(1)' }));
    await assertSucceeds(updateDoc(doc(db, ITEM), { productUrl: 'https://shop.example.com/kitkat' }));
  });
});
