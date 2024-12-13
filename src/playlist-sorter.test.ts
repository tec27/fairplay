import { ReadonlyDeep } from 'type-fest'
import { expect, test } from 'vitest'
import { findNextReorderOp, ReorderOp } from './playlist-sorter'
import { PlaylistItem } from './spotify-api'

const TEST_PLAYLIST: ReadonlyDeep<PlaylistItem[]> = [
  { addedBy: { id: 'fooUser' }, track: { durationMs: 199560, id: '6r7cyD3KA3m65C9RBSTxYf' } },
  {
    addedBy: { id: 'barUser' },
    track: { durationMs: 3601656, id: '3z8T28TrqcYuANI7MlBg93' },
  },
  { addedBy: { id: 'fooUser' }, track: { durationMs: 233085, id: '16yFuOEn0CrjQR7SZotv8B' } },
  { addedBy: { id: 'fooUser' }, track: { durationMs: 224013, id: '2SSVIRJ4PPrVcc9BwvuHtX' } },
  {
    addedBy: { id: 'otherUser' },
    track: { durationMs: 200386, id: '3ZpfXyQgcqdSA1TGNc7Ret' },
  },
  {
    addedBy: { id: 'otherUser' },
    track: { durationMs: 204466, id: '7eBpUuPnDTfbeP1P4P93CS' },
  },
  {
    addedBy: { id: 'otherUser' },
    track: { durationMs: 180360, id: '6LnEoRQKMcaFTR5UvaKuBy' },
  },
  { addedBy: { id: 'fooUser' }, track: { durationMs: 140000, id: '6uANFgbxItwdZddunMsiaj' } },
  {
    addedBy: { id: 'otherUser' },
    track: { durationMs: 178453, id: '3QwiidVHfeE9y5jl4n2MTC' },
  },
  {
    addedBy: { id: 'yetAnotherUser' },
    track: { durationMs: 119757, id: '0a0tVMRgG0VDESHKMjVSNY' },
  },
  { addedBy: { id: 'barUser' }, track: { durationMs: 75610, id: '73AiQc9SXjjeii7jbhQ6Vc' } },
  {
    addedBy: { id: 'otherUser' },
    track: { durationMs: 201773, id: '065yxZRBAsenRLZacB1uc2' },
  },
  {
    addedBy: { id: 'otherUser' },
    track: { durationMs: 216320, id: '3CNsTZucbMBsWskZdVIdLd' },
  },
  {
    addedBy: { id: 'otherUser' },
    track: { durationMs: 157026, id: '5UpOKgvHCp0HkXDgxmWM7F' },
  },
  {
    addedBy: { id: 'otherUser' },
    track: { durationMs: 200653, id: '6rp55IcEsq3nJgTc0kMa0h' },
  },
  {
    addedBy: { id: 'otherUser' },
    track: { durationMs: 174506, id: '7qkv7ZLTIMkObkyhNo6sdQ' },
  },
  {
    addedBy: { id: 'otherUser' },
    track: { durationMs: 197586, id: '5fATV9lsJ4BtPgOCnXvoYO' },
  },
]

function applyReorderOp(items: PlaylistItem[], op: ReorderOp) {
  const [removed] = items.splice(op.from, 1)
  items.splice(op.insertBefore, 0, removed)
}

test('finds correct first track in test data', () => {
  const result = findNextReorderOp(TEST_PLAYLIST)
  expect(result).toEqual({ from: 4, insertBefore: 2 })
})

test('finds correct track when starting after unsorted', () => {
  const result = findNextReorderOp(TEST_PLAYLIST, 5)
  expect(result).toEqual({ from: 9, insertBefore: 5 })
})

test('sorts the entire test data in succession', () => {
  const items = TEST_PLAYLIST.slice()
  let opCount = 0
  let op: ReorderOp | undefined
  while ((op = findNextReorderOp(items))) {
    opCount++
    applyReorderOp(items, op)
  }

  expect(opCount).toBe(11)
  expect(items).toMatchInlineSnapshot(`
    [
      {
        "addedBy": {
          "id": "fooUser",
        },
        "track": {
          "durationMs": 199560,
          "id": "6r7cyD3KA3m65C9RBSTxYf",
        },
      },
      {
        "addedBy": {
          "id": "barUser",
        },
        "track": {
          "durationMs": 3601656,
          "id": "3z8T28TrqcYuANI7MlBg93",
        },
      },
      {
        "addedBy": {
          "id": "otherUser",
        },
        "track": {
          "durationMs": 200386,
          "id": "3ZpfXyQgcqdSA1TGNc7Ret",
        },
      },
      {
        "addedBy": {
          "id": "yetAnotherUser",
        },
        "track": {
          "durationMs": 119757,
          "id": "0a0tVMRgG0VDESHKMjVSNY",
        },
      },
      {
        "addedBy": {
          "id": "fooUser",
        },
        "track": {
          "durationMs": 233085,
          "id": "16yFuOEn0CrjQR7SZotv8B",
        },
      },
      {
        "addedBy": {
          "id": "otherUser",
        },
        "track": {
          "durationMs": 204466,
          "id": "7eBpUuPnDTfbeP1P4P93CS",
        },
      },
      {
        "addedBy": {
          "id": "otherUser",
        },
        "track": {
          "durationMs": 180360,
          "id": "6LnEoRQKMcaFTR5UvaKuBy",
        },
      },
      {
        "addedBy": {
          "id": "fooUser",
        },
        "track": {
          "durationMs": 224013,
          "id": "2SSVIRJ4PPrVcc9BwvuHtX",
        },
      },
      {
        "addedBy": {
          "id": "otherUser",
        },
        "track": {
          "durationMs": 178453,
          "id": "3QwiidVHfeE9y5jl4n2MTC",
        },
      },
      {
        "addedBy": {
          "id": "fooUser",
        },
        "track": {
          "durationMs": 140000,
          "id": "6uANFgbxItwdZddunMsiaj",
        },
      },
      {
        "addedBy": {
          "id": "otherUser",
        },
        "track": {
          "durationMs": 201773,
          "id": "065yxZRBAsenRLZacB1uc2",
        },
      },
      {
        "addedBy": {
          "id": "otherUser",
        },
        "track": {
          "durationMs": 216320,
          "id": "3CNsTZucbMBsWskZdVIdLd",
        },
      },
      {
        "addedBy": {
          "id": "otherUser",
        },
        "track": {
          "durationMs": 157026,
          "id": "5UpOKgvHCp0HkXDgxmWM7F",
        },
      },
      {
        "addedBy": {
          "id": "otherUser",
        },
        "track": {
          "durationMs": 200653,
          "id": "6rp55IcEsq3nJgTc0kMa0h",
        },
      },
      {
        "addedBy": {
          "id": "otherUser",
        },
        "track": {
          "durationMs": 174506,
          "id": "7qkv7ZLTIMkObkyhNo6sdQ",
        },
      },
      {
        "addedBy": {
          "id": "otherUser",
        },
        "track": {
          "durationMs": 197586,
          "id": "5fATV9lsJ4BtPgOCnXvoYO",
        },
      },
      {
        "addedBy": {
          "id": "barUser",
        },
        "track": {
          "durationMs": 75610,
          "id": "73AiQc9SXjjeii7jbhQ6Vc",
        },
      },
    ]
  `)
})

test('sorts the entire test data in succession (with startAt)', () => {
  const items = TEST_PLAYLIST.slice()
  let opCount = 0
  let startAt = 1
  let op: ReorderOp | undefined
  while ((op = findNextReorderOp(items, startAt))) {
    opCount++
    applyReorderOp(items, op)
    startAt = op.insertBefore + 1
  }

  expect(opCount).toBe(11)
  expect(items).toMatchInlineSnapshot(`
    [
      {
        "addedBy": {
          "id": "fooUser",
        },
        "track": {
          "durationMs": 199560,
          "id": "6r7cyD3KA3m65C9RBSTxYf",
        },
      },
      {
        "addedBy": {
          "id": "barUser",
        },
        "track": {
          "durationMs": 3601656,
          "id": "3z8T28TrqcYuANI7MlBg93",
        },
      },
      {
        "addedBy": {
          "id": "otherUser",
        },
        "track": {
          "durationMs": 200386,
          "id": "3ZpfXyQgcqdSA1TGNc7Ret",
        },
      },
      {
        "addedBy": {
          "id": "yetAnotherUser",
        },
        "track": {
          "durationMs": 119757,
          "id": "0a0tVMRgG0VDESHKMjVSNY",
        },
      },
      {
        "addedBy": {
          "id": "fooUser",
        },
        "track": {
          "durationMs": 233085,
          "id": "16yFuOEn0CrjQR7SZotv8B",
        },
      },
      {
        "addedBy": {
          "id": "otherUser",
        },
        "track": {
          "durationMs": 204466,
          "id": "7eBpUuPnDTfbeP1P4P93CS",
        },
      },
      {
        "addedBy": {
          "id": "otherUser",
        },
        "track": {
          "durationMs": 180360,
          "id": "6LnEoRQKMcaFTR5UvaKuBy",
        },
      },
      {
        "addedBy": {
          "id": "fooUser",
        },
        "track": {
          "durationMs": 224013,
          "id": "2SSVIRJ4PPrVcc9BwvuHtX",
        },
      },
      {
        "addedBy": {
          "id": "otherUser",
        },
        "track": {
          "durationMs": 178453,
          "id": "3QwiidVHfeE9y5jl4n2MTC",
        },
      },
      {
        "addedBy": {
          "id": "fooUser",
        },
        "track": {
          "durationMs": 140000,
          "id": "6uANFgbxItwdZddunMsiaj",
        },
      },
      {
        "addedBy": {
          "id": "otherUser",
        },
        "track": {
          "durationMs": 201773,
          "id": "065yxZRBAsenRLZacB1uc2",
        },
      },
      {
        "addedBy": {
          "id": "otherUser",
        },
        "track": {
          "durationMs": 216320,
          "id": "3CNsTZucbMBsWskZdVIdLd",
        },
      },
      {
        "addedBy": {
          "id": "otherUser",
        },
        "track": {
          "durationMs": 157026,
          "id": "5UpOKgvHCp0HkXDgxmWM7F",
        },
      },
      {
        "addedBy": {
          "id": "otherUser",
        },
        "track": {
          "durationMs": 200653,
          "id": "6rp55IcEsq3nJgTc0kMa0h",
        },
      },
      {
        "addedBy": {
          "id": "otherUser",
        },
        "track": {
          "durationMs": 174506,
          "id": "7qkv7ZLTIMkObkyhNo6sdQ",
        },
      },
      {
        "addedBy": {
          "id": "otherUser",
        },
        "track": {
          "durationMs": 197586,
          "id": "5fATV9lsJ4BtPgOCnXvoYO",
        },
      },
      {
        "addedBy": {
          "id": "barUser",
        },
        "track": {
          "durationMs": 75610,
          "id": "73AiQc9SXjjeii7jbhQ6Vc",
        },
      },
    ]
  `)
})
