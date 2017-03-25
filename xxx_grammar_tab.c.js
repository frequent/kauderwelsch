// =============================================================================
//                           KAUDERWELSCH PARSER
// =============================================================================

// Manage memory until it can be removed from the Bison parser
// https://github.com/codemix/malloc/blob/master/src/index.js

/* @flow */

const POINTER_SIZE_IN_BYTES = 4;
const MAX_HEIGHT = 32;


const HEADER_SIZE_IN_QUADS = 1 + (MAX_HEIGHT * 2);
const HEADER_OFFSET_IN_QUADS = 1;

const HEIGHT_OFFSET_IN_QUADS = 0;
const PREV_OFFSET_IN_QUADS = 1;
const NEXT_OFFSET_IN_QUADS = 2;

const POINTER_SIZE_IN_QUADS = 1;
const POINTER_OVERHEAD_IN_QUADS = 2;

const MIN_FREEABLE_SIZE_IN_QUADS = 3;
const FIRST_BLOCK_OFFSET_IN_QUADS = HEADER_OFFSET_IN_QUADS + HEADER_SIZE_IN_QUADS + POINTER_OVERHEAD_IN_QUADS;

const MIN_FREEABLE_SIZE_IN_BYTES = 16;
const FIRST_BLOCK_OFFSET_IN_BYTES = FIRST_BLOCK_OFFSET_IN_QUADS * POINTER_SIZE_IN_BYTES;
const OVERHEAD_IN_BYTES = (FIRST_BLOCK_OFFSET_IN_QUADS + 1) * POINTER_SIZE_IN_BYTES;

const ALIGNMENT_IN_BYTES = 8;
const ALIGNMENT_MASK = ALIGNMENT_IN_BYTES - 1;

const UPDATES: Int32Array = (new Int32Array(MAX_HEIGHT)).fill(HEADER_OFFSET_IN_QUADS);

type ListNode = {
  type: string;
  offset: int32;
  size: int32;
  height: int32;
  pointers: int32[];
};

type InspectionResult = {
  header: ListNode;
  blocks: Array<{
    type: string;
    size: int32;
    node?: ListNode
  }>;
};

export default class Allocator {

  buffer: ArrayBuffer;
  byteOffset: uint32;
  byteLength: uint32;
  int32Array: Int32Array;

  /**
   * Initialize the allocator from the given Buffer or ArrayBuffer.
   */
  constructor (buffer: Buffer|ArrayBuffer, byteOffset: uint32 = 0, byteLength: uint32 = 0) {
    pre: {
      if (buffer instanceof Buffer) {
        byteLength <= buffer.length;
      }
      else if (buffer instanceof ArrayBuffer) {
        byteLength <= buffer.byteLength;
      }
    }
    if (buffer instanceof Buffer) {
      this.buffer = buffer.buffer;
      this.byteOffset = buffer.byteOffset + byteOffset;
      this.byteLength = byteLength === 0 ? buffer.length : byteLength;
    }
    else if (buffer instanceof ArrayBuffer) {
      this.buffer = buffer;
      this.byteOffset = byteOffset;
      this.byteLength = byteLength === 0 ? buffer.byteLength - byteOffset : byteLength;
    }
    else {
      throw new TypeError(`Expected buffer to be an instance of Buffer or ArrayBuffer`);
    }
    assert: this.byteLength >= OVERHEAD_IN_BYTES;
    this.int32Array = prepare(new Int32Array(this.buffer, this.byteOffset, bytesToQuads(this.byteLength)));
    checkListIntegrity(this.int32Array);
  }

  /**
   * Allocate a given number of bytes and return the offset.
   * If allocation fails, returns 0.
   */
  alloc (numberOfBytes: int32): int32 {

    pre: checkListIntegrity(this.int32Array);

    post: {
      it === 0 || it >= quadsToBytes(FIRST_BLOCK_OFFSET_IN_QUADS);
      checkListIntegrity(this.int32Array);
    }

    numberOfBytes = align(numberOfBytes);

    if (numberOfBytes < MIN_FREEABLE_SIZE_IN_BYTES) {
      numberOfBytes = MIN_FREEABLE_SIZE_IN_BYTES;
    }
    else if (numberOfBytes > this.byteLength) {
      throw new RangeError(`Allocation size must be between ${MIN_FREEABLE_SIZE_IN_BYTES} bytes and ${this.byteLength - OVERHEAD_IN_BYTES} bytes`);
    }

    trace: `Allocating ${numberOfBytes} bytes.`;

    const minimumSize: int32 = bytesToQuads(numberOfBytes);
    const int32Array: Int32Array = this.int32Array;
    const block: int32 = findFreeBlock(int32Array, minimumSize);
    if (block <= HEADER_OFFSET_IN_QUADS) {
      return 0;
    }
    const blockSize: int32 = readSize(int32Array, block);

    assert: {
      blockSize >= POINTER_SIZE_IN_QUADS;
      blockSize < this.byteLength;
    }

    if (blockSize - (minimumSize + POINTER_OVERHEAD_IN_QUADS) >= MIN_FREEABLE_SIZE_IN_QUADS) {
      split(int32Array, block, minimumSize, blockSize);
    }
    else {
      remove(int32Array, block, blockSize);
    }

    return quadsToBytes(block);
  }

  /**
   * Allocate and clear the given number of bytes and return the offset.
   * If allocation fails, returns 0.
   */
  calloc (numberOfBytes: int32): int32 {
    post: {
      it === 0 || it >= quadsToBytes(FIRST_BLOCK_OFFSET_IN_QUADS);
      checkListIntegrity(this.int32Array);
    }

    if (numberOfBytes < MIN_FREEABLE_SIZE_IN_BYTES) {
      numberOfBytes = MIN_FREEABLE_SIZE_IN_BYTES;
    }
    else {
      numberOfBytes = align(numberOfBytes);
    }

    const address = this.alloc(numberOfBytes);
    if (address === 0) {
      // Not enough space
      return 0;
    }
    const int32Array = this.int32Array;
    const offset = bytesToQuads(address);
    const limit = numberOfBytes / 4;
    for (let i = 0; i < limit; i++) {
      int32Array[offset + i] = 0;
    }
    return address;
  }

  /**
   * Free a number of bytes from the given address.
   */
  free (address: int32): int32 {

    pre: checkListIntegrity(this.int32Array);

    post: {
      it >= 0;
      it < quadsToBytes(this.int32Array.length);
      checkListIntegrity(this.int32Array);
    }

    if ((address & ALIGNMENT_MASK) !== 0) {
      throw new RangeError(`Address must be a multiple of (${ALIGNMENT_IN_BYTES}).`);
    }

    if (address < FIRST_BLOCK_OFFSET_IN_BYTES || address > this.byteLength) {
      throw new RangeError(`Address must be between ${FIRST_BLOCK_OFFSET_IN_BYTES} and ${this.byteLength - OVERHEAD_IN_BYTES}`);
    }

    const int32Array: Int32Array = this.int32Array;
    const block = bytesToQuads(address);

    const blockSize: uint32 = readSize(int32Array, block);

    trace: `Freeing ${quadsToBytes(blockSize)} bytes from block ${address}.`;

    /* istanbul ignore if  */
    if (blockSize < MIN_FREEABLE_SIZE_IN_QUADS || blockSize > (this.byteLength - OVERHEAD_IN_BYTES) / 4) {
      throw new RangeError(`Invalid block: ${block}, got block size: ${quadsToBytes(blockSize)}`);
    }

    const preceding: int32 = getFreeBlockBefore(int32Array, block);
    const trailing: int32 = getFreeBlockAfter(int32Array, block);
    if (preceding !== 0) {
      if (trailing !== 0) {
        return quadsToBytes(insertMiddle(int32Array, preceding, block, blockSize, trailing));
      }
      else {
        return quadsToBytes(insertAfter(int32Array, preceding, block, blockSize));
      }
    }
    else if (trailing !== 0) {
      return quadsToBytes(insertBefore(int32Array, trailing, block, blockSize));
    }
    else {
      return quadsToBytes(insert(int32Array, block, blockSize));
    }
  }

  /**
   * Return the size of the block at the given address.
   */
  sizeOf (address: int32): uint32 {
    if (address < FIRST_BLOCK_OFFSET_IN_BYTES || address > this.byteLength || typeof address !== 'number' || isNaN(address)) {
      throw new RangeError(`Address must be between ${FIRST_BLOCK_OFFSET_IN_BYTES} and ${this.byteLength - OVERHEAD_IN_BYTES}`);
    }

    if ((address & ALIGNMENT_MASK) !== 0) {
      throw new RangeError(`Address must be a multiple of the pointer size (${POINTER_SIZE_IN_BYTES}).`);
    }

    return quadsToBytes(readSize(this.int32Array, bytesToQuads(address)));
  }

  /**
   * Inspect the instance.
   */
  inspect (): InspectionResult {
    return inspect(this.int32Array);
  }
}

/**
 * Prepare the given int32Array and ensure it contains a valid header.
 */
export function prepare (int32Array: Int32Array): Int32Array {
  if (!verifyHeader(int32Array)) {
    writeInitialHeader(int32Array);
  }
  return int32Array;
}

/**
 * Verify that the int32Array contains a valid header.
 */
export function verifyHeader (int32Array: Int32Array): boolean {
  return int32Array[HEADER_OFFSET_IN_QUADS - 1] === HEADER_SIZE_IN_QUADS
      && int32Array[HEADER_OFFSET_IN_QUADS + HEADER_SIZE_IN_QUADS] === HEADER_SIZE_IN_QUADS;
}

/**
 * Write the initial header for an empty int32Array.
 */
function writeInitialHeader (int32Array: Int32Array) {
  trace: `Writing initial header.`;
  const header = HEADER_OFFSET_IN_QUADS;
  const headerSize = HEADER_SIZE_IN_QUADS;
  const block = FIRST_BLOCK_OFFSET_IN_QUADS;
  const blockSize = int32Array.length - (header + headerSize + POINTER_OVERHEAD_IN_QUADS + POINTER_SIZE_IN_QUADS);

  writeFreeBlockSize(int32Array, headerSize, header);
  int32Array[header + HEIGHT_OFFSET_IN_QUADS] = 1;
  int32Array[header + NEXT_OFFSET_IN_QUADS] = block;
  for (let height = 1; height < MAX_HEIGHT; height++) {
    int32Array[header + NEXT_OFFSET_IN_QUADS + height] = HEADER_OFFSET_IN_QUADS;
  }

  writeFreeBlockSize(int32Array, blockSize, block);
  int32Array[block + HEIGHT_OFFSET_IN_QUADS] = 1;
  int32Array[block + NEXT_OFFSET_IN_QUADS] = header;
}

/**
 * Check the integrity of the freelist in the given array.
 */
export function checkListIntegrity (int32Array: Int32Array): boolean {
  let block: int32 = FIRST_BLOCK_OFFSET_IN_QUADS;
  while (block < int32Array.length - POINTER_SIZE_IN_QUADS) {
    const size: int32 = readSize(int32Array, block);
    /* istanbul ignore if  */
    if (size < POINTER_OVERHEAD_IN_QUADS || size >= int32Array.length - FIRST_BLOCK_OFFSET_IN_QUADS) {
      throw new Error(`Got invalid sized chunk at ${quadsToBytes(block)} (${quadsToBytes(size)} bytes).`);
    }
    else if (isFree(int32Array, block)) {
      checkFreeBlockIntegrity(int32Array, block, size);
    }
    else {
      checkUsedBlockIntegrity(int32Array, block, size);
    }
    block += size + POINTER_OVERHEAD_IN_QUADS;
  }
  return true;
}

function checkFreeBlockIntegrity (int32Array: Int32Array, block: int32, blockSize: int32): boolean {
  /* istanbul ignore if  */
  if (int32Array[block - 1] !== int32Array[block + blockSize]) {
    throw new Error(`Block length header does not match footer (${quadsToBytes(int32Array[block - 1])} vs ${quadsToBytes(int32Array[block + blockSize])}).`);
  }
  const height: int32 = int32Array[block + HEIGHT_OFFSET_IN_QUADS];
  /* istanbul ignore if  */
  if (height < 1 || height > MAX_HEIGHT) {
    throw new Error(`Block ${quadsToBytes(block)} height must be between 1 and ${MAX_HEIGHT}, got ${height}.`);
  }
  for (let i = 0; i < height; i++) {
    const pointer = int32Array[block + NEXT_OFFSET_IN_QUADS + i];
    /* istanbul ignore if  */
    if (pointer >= FIRST_BLOCK_OFFSET_IN_QUADS && !isFree(int32Array, pointer)) {
      throw new Error(`Block ${quadsToBytes(block)} has a pointer to a non-free block (${quadsToBytes(pointer)}).`);
    }
  }
  return true;
}

function checkUsedBlockIntegrity (int32Array: Int32Array, block: int32, blockSize: int32): boolean {
  /* istanbul ignore if  */
  if (int32Array[block - 1] !== int32Array[block + blockSize]) {
    throw new Error(`Block length header does not match footer (${quadsToBytes(int32Array[block - 1])} vs ${quadsToBytes(int32Array[block + blockSize])}).`);
  }
  else {
    return true;
  }
}


/**
 * Inspect the freelist in the given array.
 */
export function inspect (int32Array: Int32Array): InspectionResult {
  const blocks: {type: string; size: int32; node?: ListNode}[] = [];
  const header: ListNode = readListNode(int32Array, HEADER_OFFSET_IN_QUADS);
  let block: int32 = FIRST_BLOCK_OFFSET_IN_QUADS;
  while (block < int32Array.length - POINTER_SIZE_IN_QUADS) {
    const size: int32 = readSize(int32Array, block);
    /* istanbul ignore if  */
    if (size < POINTER_OVERHEAD_IN_QUADS || size >= int32Array.length) {
      throw new Error(`Got invalid sized chunk at ${quadsToBytes(block)} (${quadsToBytes(size)})`);
    }
    if (isFree(int32Array, block)) {
      // @flowIssue todo
      blocks.push(readListNode(int32Array, block));
    }
    else {
      blocks.push({
        type: 'used',
        offset: quadsToBytes(block),
        size: quadsToBytes(size)
      });
    }
    block += size + POINTER_OVERHEAD_IN_QUADS;
  }
  return {header, blocks};
}

/**
 * Convert quads to bytes.
 */
function quadsToBytes (num: int32): int32 {
  return num * POINTER_SIZE_IN_BYTES;
}

/**
 * Convert bytes to quads.
 */
function bytesToQuads (num: int32): int32 {
  return Math.ceil(num / POINTER_SIZE_IN_BYTES);
}

/**
 * Align the given value to 8 bytes.
 */
function align (value: int32): int32 {
  return (value + ALIGNMENT_MASK) & ~ALIGNMENT_MASK;
}

/**
 * Read the list pointers for a given block.
 */
function readListNode (int32Array: Int32Array, block: int32): ListNode {
  pre: {
    block + MIN_FREEABLE_SIZE_IN_QUADS < int32Array.length;
  }

  const height: int32 = int32Array[block + HEIGHT_OFFSET_IN_QUADS];
  const pointers: int32[] = [];
  for (let i = 0; i < height; i++) {
    pointers.push(quadsToBytes(int32Array[block + NEXT_OFFSET_IN_QUADS + i]));
  }

  return {
    type: 'free',
    offset: quadsToBytes(block),
    height,
    pointers,
    size: quadsToBytes(int32Array[block - 1])
  };
}


/**
 * Read the size (in quads) of the block at the given address.
 */
function readSize (int32Array: Int32Array, block: int32): int32 {
  pre: {
    block >= 1;
    block < int32Array.length;
  }
  post: {
    it > 0;
    it <= int32Array.length;
    int32Array[block - 1] === int32Array[block + Math.abs(int32Array[block - 1])];
  }
  return Math.abs(int32Array[block - 1]);
}

/**
 * Write the size of the block at the given address.
 * Note: This ONLY works for free blocks, not blocks in use.
 */
function writeFreeBlockSize (int32Array: Int32Array, size: int32, block: int32): void {
  pre: {
    block >= 1;
    size !== 0;
  }
  post: {
    int32Array[block - 1] === size;
    int32Array[block + size] === size;
  }

  int32Array[block - 1] = size;
  int32Array[block + size] = size;
}

/**
 * Populate the `UPDATES` array with the offset of the last item in each
 * list level, *before* a node of at least the given size.
 */
function findPredecessors (int32Array: Int32Array, minimumSize: int32): void {
  pre: {
    minimumSize >= MIN_FREEABLE_SIZE_IN_QUADS, "Cannot handle blocks smaller than the minimum freeable size.";
    minimumSize < int32Array.length, "Cannot handle blocks larger than the capacity of the backing array.";
  }

  const listHeight: int32 = int32Array[HEADER_OFFSET_IN_QUADS + HEIGHT_OFFSET_IN_QUADS];

  let node: int32 = HEADER_OFFSET_IN_QUADS;

  for (let height = listHeight; height > 0; height--) {
    let next: int32 = node + NEXT_OFFSET_IN_QUADS + (height - 1);
    while (int32Array[next] >= FIRST_BLOCK_OFFSET_IN_QUADS && int32Array[int32Array[next] - 1] < minimumSize) {
      node = int32Array[next];
      next = node + NEXT_OFFSET_IN_QUADS + (height - 1);
    }
    UPDATES[height - 1] = node;
  }
}

/**
 * Find a free block with at least the given size and return its offset in quads.
 */
function findFreeBlock (int32Array: Int32Array, minimumSize: int32): int32 {
  pre: {
    minimumSize >= MIN_FREEABLE_SIZE_IN_QUADS;
    minimumSize < int32Array.length;
  }
  post: {
    it >= HEADER_OFFSET_IN_QUADS;
    it < int32Array.length;
    if (it !== HEADER_OFFSET_IN_QUADS) {
      readSize(int32Array, it) >= minimumSize;
    }
  }

  trace: `Finding a free block of at least ${quadsToBytes(minimumSize)} bytes.`;

  let block: int32 = HEADER_OFFSET_IN_QUADS;

  for (let height = int32Array[HEADER_OFFSET_IN_QUADS + HEIGHT_OFFSET_IN_QUADS]; height > 0; height--) {
    let next: int32 = int32Array[block + NEXT_OFFSET_IN_QUADS + (height - 1)];

    while (next !== HEADER_OFFSET_IN_QUADS && int32Array[next - 1] < minimumSize) {
      block = next;
      next = int32Array[block + NEXT_OFFSET_IN_QUADS + (height - 1)];
    }
  }

  block = int32Array[block + NEXT_OFFSET_IN_QUADS];
  if (block === HEADER_OFFSET_IN_QUADS) {
    trace: `Could not find a block large enough.`;
    return block;
  }
  else {
    trace: `Got block ${quadsToBytes(block)} (${quadsToBytes(int32Array[block - 1])} bytes).`
    return block;
  }
}


/**
 * Split the given block after a certain number of bytes and add the second half to the freelist.
 */
function split (int32Array: Int32Array, block: int32, firstSize: int32, blockSize: int32): void {
  pre: {
    block < int32Array.length;
    firstSize >= MIN_FREEABLE_SIZE_IN_QUADS;
    block + firstSize <= int32Array.length;
    blockSize > firstSize;
    block + blockSize <= int32Array.length;
  }

  const second: int32 = (block + firstSize + POINTER_OVERHEAD_IN_QUADS);
  const secondSize: int32 = (blockSize - (second - block));

  assert: {
    secondSize >= MIN_FREEABLE_SIZE_IN_QUADS;
    firstSize + secondSize + POINTER_OVERHEAD_IN_QUADS === blockSize;
  }

  trace: `Splitting block ${quadsToBytes(block)} (${quadsToBytes(blockSize)} bytes) into ${quadsToBytes(firstSize)} bytes and ${quadsToBytes(secondSize)} bytes.`;

  remove(int32Array, block, blockSize);
  assert: !hasPointersTo(int32Array, block), `All traces of the node must be removed.`;

  int32Array[block - 1] = -firstSize;
  int32Array[block + firstSize] = -firstSize;

  assert: {
    !isFree(int32Array, block);
  }

  trace: "Removed first block, inserting second.";
  int32Array[second - 1] = -secondSize;
  int32Array[second + secondSize] = -secondSize;

  insert(int32Array, second, secondSize);

  assert: isFree(int32Array, second);
}

/**
 * Remove the given block from the freelist and mark it as allocated.
 */
function remove (int32Array: Int32Array, block: int32, blockSize: int32): void {
  pre: {
    block !== HEADER_OFFSET_IN_QUADS, "Cannot remove the header block.";
    block < int32Array.length, "Block must be within bounds.";
    blockSize >= MIN_FREEABLE_SIZE_IN_QUADS, "Block size must be at least the minimum freeable size.";
    block + blockSize <= int32Array.length, "Block cannot exceed the length of the backing array.";
  }
  post: {
    int32Array[block - 1] === -blockSize, "Block is marked as allocated.";
    int32Array[block + blockSize] === -blockSize, "Block is marked as allocated.";
    !hasPointersTo(int32Array, block), `All traces of the block (${quadsToBytes(block)}) must be removed. ${UPDATES.map(quadsToBytes).join(', ')}`;
  }

  trace: `Removing block ${quadsToBytes(block)} (${quadsToBytes(blockSize)} bytes).`;
  findPredecessors(int32Array, blockSize);

  let node: int32 = int32Array[UPDATES[0] + NEXT_OFFSET_IN_QUADS];

  while (node !== block && node !== HEADER_OFFSET_IN_QUADS && int32Array[node - 1] <= blockSize) {
    trace: `Skipping ${quadsToBytes(node)}`;
    for (let height: number = int32Array[node + HEIGHT_OFFSET_IN_QUADS] - 1; height >= 0; height--) {
      if (int32Array[node + NEXT_OFFSET_IN_QUADS + height] === block) {
        UPDATES[height] = node;
      }
    }
    node = int32Array[node + NEXT_OFFSET_IN_QUADS];
  }

  /* istanbul ignore if  */
  if (node !== block) {
    throw new Error(`Could not find block to remove.`);
  }

  let listHeight: int32 = int32Array[HEADER_OFFSET_IN_QUADS + HEIGHT_OFFSET_IN_QUADS];
  for (let height = 0; height < listHeight; height++) {
    const next: int32 = int32Array[UPDATES[height] + NEXT_OFFSET_IN_QUADS + height];
    if (next !== block) {
      trace: `No higher level points to this node, so breaking early.`;
      break;
    }
    int32Array[UPDATES[height] + NEXT_OFFSET_IN_QUADS + height] = int32Array[block + NEXT_OFFSET_IN_QUADS + height];
  }

  while (listHeight > 0 && int32Array[HEADER_OFFSET_IN_QUADS + NEXT_OFFSET_IN_QUADS + (listHeight - 1)] === HEADER_OFFSET_IN_QUADS) {
    listHeight--;
    int32Array[HEADER_OFFSET_IN_QUADS + HEIGHT_OFFSET_IN_QUADS] = listHeight;
    trace: `Reducing list height to ${listHeight}`;
  }
  // invert the size sign to signify an allocated block
  int32Array[block - 1] = -blockSize;
  int32Array[block + blockSize] = -blockSize;
}

/**
 * Iterate all of the free blocks in the list, looking for pointers to the given block.
 */
function hasPointersTo (int32Array: Int32Array, block: int32): boolean {
  let next: int32 = FIRST_BLOCK_OFFSET_IN_QUADS;

  while (next < int32Array.length - POINTER_SIZE_IN_QUADS) {
    if (isFree(int32Array, next)) {
      for (let height = int32Array[next + HEIGHT_OFFSET_IN_QUADS] - 1; height >= 0; height--) {
        const pointer: int32 = int32Array[next + NEXT_OFFSET_IN_QUADS + height];
        /* istanbul ignore if  */
        if (pointer === block) {
          return true;
        }
      }
    }
    next += readSize(int32Array, next) + POINTER_OVERHEAD_IN_QUADS;
  }
  return false;
}

/**
 * Determine whether the block at the given address is free or not.
 */
function isFree (int32Array: Int32Array, block: int32): boolean {
  pre: {
    block < int32Array.length;
  }

  /* istanbul ignore if  */
  if (block < HEADER_SIZE_IN_QUADS) {
    return false;
  }

  const size: int32 = int32Array[block - POINTER_SIZE_IN_QUADS];

  assert: {
    size !== 0;
    if (size > 0) {
      size >= MIN_FREEABLE_SIZE_IN_QUADS;
      size < int32Array.length;
      int32Array[block + size] === size;
    }
    else {
      -size >= MIN_FREEABLE_SIZE_IN_QUADS;
      -size < int32Array.length;
      int32Array[block + -size] === size;
    }
  }

  if (size < 0) {
    return false;
  }
  else {
    return true;
  }
}


/**
 * Get the address of the block before the given one and return the address *if it is free*,
 * otherwise 0.
 */
function getFreeBlockBefore (int32Array: Int32Array, block: int32): int32 {
  pre: {
    block < int32Array.length;
  }
  post: {
    it >= 0;
    it < block;
  }

  if (block <= FIRST_BLOCK_OFFSET_IN_QUADS) {
    return 0;
  }
  const beforeSize: int32 = int32Array[block - POINTER_OVERHEAD_IN_QUADS];

  assert: {
    beforeSize < int32Array.length;
  }

  if (beforeSize < POINTER_OVERHEAD_IN_QUADS) {
    return 0;
  }
  return block - (POINTER_OVERHEAD_IN_QUADS + beforeSize);
}

/**
 * Get the address of the block after the given one and return its address *if it is free*,
 * otherwise 0.
 */
function getFreeBlockAfter (int32Array: Int32Array, block: int32): int32 {
  pre: {
    block < int32Array.length;
  }
  post: {
    if (it !== 0) {
      it > block;
      it < int32Array.length - MIN_FREEABLE_SIZE_IN_QUADS;
    }
  }

  const blockSize: int32 = readSize(int32Array, block);
  if (block + blockSize + POINTER_OVERHEAD_IN_QUADS >= int32Array.length - 2) {
    // Block is the last in the list.
    return 0;
  }
  const next: int32 = (block + blockSize + POINTER_OVERHEAD_IN_QUADS);
  const nextSize: int32 = int32Array[next - POINTER_SIZE_IN_QUADS];

  assert: {
    if (nextSize > 0) {
      nextSize >= MIN_FREEABLE_SIZE_IN_QUADS;
      next + nextSize <= int32Array.length;
    }
  }

  if (nextSize < POINTER_OVERHEAD_IN_QUADS) {
    return 0;
  }
  return next;
}


/**
 * Insert the given block into the freelist and return the number of bytes that were freed.
 */
function insert (int32Array: Int32Array, block: int32, blockSize: int32): int32 {
  pre: {
    block < int32Array.length;
    blockSize >= MIN_FREEABLE_SIZE_IN_QUADS;
    block + blockSize <= int32Array.length;
    !isFree(int32Array, block);
  }
  post: {
    isFree(int32Array, block);
  }

  trace: `Inserting block ${quadsToBytes(block)} (${quadsToBytes(blockSize)} bytes).`;

  findPredecessors(int32Array, blockSize);

  const blockHeight: int32 = generateHeight(int32Array, block, blockSize);
  const listHeight: int32 = int32Array[HEADER_OFFSET_IN_QUADS + HEIGHT_OFFSET_IN_QUADS];

  for (let height = 1; height <= blockHeight; height++) {
    assert: UPDATES[height - 1] > 0;
    const update: int32 = UPDATES[height - 1] + NEXT_OFFSET_IN_QUADS + (height - 1);
    trace: `Writing next (${height}) pointer (${quadsToBytes(UPDATES[height])}) to ${quadsToBytes(block)}.`;
    int32Array[block + NEXT_OFFSET_IN_QUADS + (height - 1)] = int32Array[update];
    int32Array[update] = block;
    UPDATES[height - 1] = HEADER_OFFSET_IN_QUADS;
  }

  int32Array[block - 1] = blockSize;
  int32Array[block + blockSize] = blockSize;
  return blockSize;
}


/**
 * Insert the given block into the freelist before the given free block,
 * joining them together, returning the number of bytes which were freed.
 */
function insertBefore (int32Array: Int32Array, trailing: int32, block: int32, blockSize: int32): int32 {
  pre: {
    block > 0;
    trailing > block;
    trailing < int32Array.length;
  }
  post: {
    it > 0;
    it < int32Array.length;
  }

  const trailingSize: int32 = readSize(int32Array, trailing);
  trace: `Inserting block ${quadsToBytes(block)} (${quadsToBytes(blockSize)} bytes) before block ${quadsToBytes(trailing)} (${quadsToBytes(trailingSize)} bytes).`;
  remove(int32Array, trailing, trailingSize);
  const size: int32 = (blockSize + trailingSize + POINTER_OVERHEAD_IN_QUADS);
  int32Array[block - POINTER_SIZE_IN_QUADS] = -size;
  int32Array[trailing + trailingSize] = -size;
  insert(int32Array, block, size);
  return blockSize;
}

/**
 * Insert the given block into the freelist in between the given free blocks,
 * joining them together, returning the number of bytes which were freed.
 */
function insertMiddle (int32Array: Int32Array, preceding: int32, block: int32, blockSize: int32, trailing: int32): int32 {
  pre: {
    block > 0;
    preceding < block;
    trailing > block;
    trailing < int32Array.length;
  }
  post: {
    it > 0;
    it < int32Array.length;
  }

  const precedingSize: int32 = readSize(int32Array, preceding);
  const trailingSize: int32 = readSize(int32Array, trailing);
  const size: int32 = ((trailing - preceding) + trailingSize);

  trace: `Inserting block ${quadsToBytes(block)} (${quadsToBytes(blockSize)} bytes) between blocks ${quadsToBytes(preceding)} (${quadsToBytes(precedingSize)} bytes) and ${quadsToBytes(trailing)} (${quadsToBytes(trailingSize)} bytes).`;

  remove(int32Array, preceding, precedingSize);
  remove(int32Array, trailing, trailingSize);
  int32Array[preceding - POINTER_SIZE_IN_QUADS] = -size;
  int32Array[trailing + trailingSize] = -size;
  insert(int32Array, preceding, size);
  return blockSize;
}

/**
 * Insert the given block into the freelist after the given free block,
 * joining them together, returning the number of bytes which were freed.
 */
function insertAfter (int32Array: Int32Array, preceding: int32, block: int32, blockSize: int32): int32 {
  pre: {
    block > 0;
    preceding < block;
    block < int32Array.length;
  }
  post: {
    it > 0;
    it < int32Array.length;
  }

  const precedingSize: int32 = (block - preceding) - POINTER_OVERHEAD_IN_QUADS;

  trace: `Inserting block ${quadsToBytes(block)} (${quadsToBytes(blockSize)} bytes) after block ${quadsToBytes(preceding)} (${quadsToBytes(precedingSize)} bytes).`;

  const size: int32 = ((block - preceding) + blockSize);
  remove(int32Array, preceding, precedingSize);
  int32Array[preceding - POINTER_SIZE_IN_QUADS] = -size;
  int32Array[block + blockSize] = -size;
  insert(int32Array, preceding, size);
  return blockSize;
}



/**
 * Generate a random height for a block, growing the list height by 1 if required.
 */
function generateHeight (int32Array: Int32Array, block: int32, blockSize: int32): int32 {
  pre: {
    blockSize >= MIN_FREEABLE_SIZE_IN_QUADS;
    blockSize < int32Array.length;
  }
  post: {
    it > 0;
    it <= MAX_HEIGHT;
    Math.floor(it) === it;
  }

  const listHeight: int32 = int32Array[HEADER_OFFSET_IN_QUADS + HEIGHT_OFFSET_IN_QUADS];
  let height: int32 = randomHeight();

  trace: `Generating a block height for block ${quadsToBytes(block)} (${quadsToBytes(blockSize)} bytes, ${blockSize} quads), got ${height}.`;

  if (blockSize - 1 < height + 1) {
    height = blockSize - 2;
    trace: `Block size is too small for the generated height, reducing height to ${height}.`;
  }

  if (height > listHeight) {
    const newHeight: int32 = listHeight + 1;
    trace: `Increasing list height from ${listHeight} to ${newHeight}.`;
    int32Array[HEADER_OFFSET_IN_QUADS + HEIGHT_OFFSET_IN_QUADS] = newHeight;
    int32Array[HEADER_OFFSET_IN_QUADS + NEXT_OFFSET_IN_QUADS + (newHeight - 1)] = HEADER_OFFSET_IN_QUADS;
    UPDATES[newHeight] = HEADER_OFFSET_IN_QUADS;
    int32Array[block + HEIGHT_OFFSET_IN_QUADS] = newHeight;
    return newHeight;
  }
  else {
    int32Array[block + HEIGHT_OFFSET_IN_QUADS] = height;
    return height;
  }
}

/**
 * Generate a random height for a new block.
 */
function randomHeight (): number {
  post: {
    it > 0;
    it <= MAX_HEIGHT;
    Math.floor(it) === it;
  }
  let height: number = 1;
  for (let r: number = Math.ceil(Math.random() * 2147483648); (r & 1) === 1 && height < MAX_HEIGHT; r >>= 1) {
    height++;
    Math.ceil(Math.random() * 2147483648)
  }
  return height;
}


/* A Bison parser, made from gram.y
   by GNU bison 1.35.  */

/*
 * ported from:
 * https://github.com/julius-speech/julius/blob/6d135a686a74376495a7a6f55d3d67df54186f83/gramtools/mkdfa/mkfa-1.44-flex/gram.tab.c
 * 
 * Copyright (c) 1991-2013 Kawahara Lab., Kyoto University
 * Copyright (c) 2000-2005 Shikano Lab., Nara Institute of Science and Technology
 * Copyright (c) 2005-2013 Julius project team, Nagoya Institute of Technology
 * All rights reserved
 */
(function () {
  var YYBISON = 1;
  var CTRL_ASSIGN = 257;
  var CTRL_IGNORE = 258;
  var OPEN = 259;
  var CLOSE = 260;
  var REVERSE = 261;
  var STARTCLASS = 262;
  var LET = 263;
  var TAG = 264;
  var SYMBOL = 265;
  var REMARK = 266;
  var NL = 267;
  
  // ------------------------------ mkfa.h -------------------------------------
  var symbol_len = 256;
  var body_class_flag = 0;
  var body_class_flag_max = body_class_flag * 8;

  var body_list = {
    "body": {},
    "next": {}
  };
  var arc = {
    "inp": 0,
    "finite_automaton": {},
    "body_class_flag_start": 0,
    "body_class_flag_accept": 0,
    "next": {}
  };
  var unify_arc = {
    "inp": 0,
    "finite_automaton": {},
    "body_class_flag_start": 0,
    "body_class_flag_accept": 0,
    "next": {},
    "flag_reserved": 0
  };
  var finite_automaton_list = {
    "finite_automation": {},
    "next": {}
  };
  var finite_automaton = {
    // common
    "stat": 0,
    "arc": [],
    "body_class_flag_start": 0,
    "body_class_flag_accept": 0,
    "flag_traversed": 0,
    // for DFA
    "psNum": 0,
    "unify_arc_list": [],
    "finite_automaton_list": [],
    "flag_volatiled": 0
  };

  function createBody() {
    return {
      "name": null,
      "flag_abort": 0,
      "next": {}
    };
  }
  function createBodyClass(my_name) {
    return {  
      "number": null,
      "name": null,
      "next": {},
      "body_list": {},
      "branch": null,
      "flag_used_fa": 0,
      "flag_used": 0,
      "flag_tmp": 0,
      "tmp": null
    };
  }

  // external parameters, should be defined
  // CLASS_LIST;
  // CLASS_LIST_TAIL;
  // START_SYMBOL;
  // NO_NEW_LINE;
  // GramFile [1024]
  // HeaderFile [1024]
  // SW_COMPAT_I;
  // SW_QUIET;
  // SW_SEMI_QUIET;
  // VERSION_NUMBER;
  // SYMBOL_LEN => 0;

  var body_class_number = 100;
  var head_name = []; // HEAD_NAME[symbol_len];
  var body_name = []; // BODY_NAME[body_class_number][symbol_len];
  var body_count = 0;
  var class_count = 0;
  var current_class_count = 0;
  var is_assign_accept_flag = 1;
  var is_block_start_or_end = 0;
  var is_block_reversed;
  var body_class_flag_start = 0;
  var error_count = 0;
  var grammar_modification_number = 0;

  // -------------------------- Declarations ----------------------------------

  // whywhy? 
  var YYSTYPE;
  var YYSTYPE_IS_TRIVIAL = 1;
  var YYDEBUG = 0;
  var YYERROR_VERBOSE;
  var YYFINAL = 43;
  var YYFLAG = -32768;
  var YYNTBASE = 14;
  var YYLAST = 53;
  
  // memory
  var allocator;
  //var fakeMemoryAlloc;  // allocator.alloc
  //var fakeMemoryFree;   // allocator.free
  //var sizeof;           // allocator.sizeof
  var size_t;
  var unsigned_int = new ArrayBuffer(4);  // 4 bytes size of unsigned int
  var short = new ArrayBuffer(2);         // 2 bytes size of short -32,768 to 32,767
  var __STDC__;
  var __GNUC__ = 0;       // never want
  var __SIZE_TYPE__;
  var __cplusplus;
  var __builtin_memcpy;
  var yyptr;              // https://opensource.apple.com/source/cc/cc-798/bison/bison.hairy.auto.html
  var YYCOPY;
  var YYSTACK_RELOCATE;
  var YYSIZE_T;
  var YYSTACK_USE_ALLOCA;
  var YYSTACK_ALLOC;
  var YYSTACK_ALLOCA;
  var YYSTACK_FREE;
  var YYSTACK_BYTES;
  var YYLTYPE_IS_TRIVIAL;
  var YYSTYPE_IS_TRIVIAL;
  var YYLSP_NEEDED;
  var YYSTYPE;
  var YYLTYPE;
  var YYSTACK_GAP_MAX;
  var YYTRANSLATE;
  var YYEMPTY = -2;
  var YYEOF = 0;
  var YYTERROR = 1;
  var YYERRCODE = 256;
  var YYPOPSTACK;
  var YYBACKUP;
  var YYRECOVERING;
  var YYFAIL;  
  var YYABORT;
  var YYACCEPT;  
  var YYEMPTY;
  var YYERROR;

  var yytranslate;
  var yyr1;
  var yyr2;
  var yydefact;
  var yydefgoto;
  var yypact;
  var yypgoto;
  var yytable;
  var yycheck;
  var yyoverflow;
  var yyprhs;
  var yyrhs;
  var yyrline;
  var yyi;
  var yynewbytes;
  var yyerrlab1;
  var yyacceptlab;
  var yyabortlab;
  var yybackup;
  var yychar;
  var yychar1;
  var yylval;
  var yyerror;
  var yyerrok;
  var yyerrstatus = 0;


  // ------------------------ Lookup Tables ------------------------------------
  
  // YYTRANSLATE[YYLEX] -- Bison token number corresponding to YYLEX.
  yytranslate = [
       0,     2,     2,     2,     2,     2,     2,     2,     2,     2,
       2,     2,     2,     2,     2,     2,     2,     2,     2,     2,
       2,     2,     2,     2,     2,     2,     2,     2,     2,     2,
       2,     2,     2,     2,     2,     2,     2,     2,     2,     2,
       2,     2,     2,     2,     2,     2,     2,     2,     2,     2,
       2,     2,     2,     2,     2,     2,     2,     2,     2,     2,
       2,     2,     2,     2,     2,     2,     2,     2,     2,     2,
       2,     2,     2,     2,     2,     2,     2,     2,     2,     2,
       2,     2,     2,     2,     2,     2,     2,     2,     2,     2,
       2,     2,     2,     2,     2,     2,     2,     2,     2,     2,
       2,     2,     2,     2,     2,     2,     2,     2,     2,     2,
       2,     2,     2,     2,     2,     2,     2,     2,     2,     2,
       2,     2,     2,     2,     2,     2,     2,     2,     2,     2,
       2,     2,     2,     2,     2,     2,     2,     2,     2,     2,
       2,     2,     2,     2,     2,     2,     2,     2,     2,     2,
       2,     2,     2,     2,     2,     2,     2,     2,     2,     2,
       2,     2,     2,     2,     2,     2,     2,     2,     2,     2,
       2,     2,     2,     2,     2,     2,     2,     2,     2,     2,
       2,     2,     2,     2,     2,     2,     2,     2,     2,     2,
       2,     2,     2,     2,     2,     2,     2,     2,     2,     2,
       2,     2,     2,     2,     2,     2,     2,     2,     2,     2,
       2,     2,     2,     2,     2,     2,     2,     2,     2,     2,
       2,     2,     2,     2,     2,     2,     2,     2,     2,     2,
       2,     2,     2,     2,     2,     2,     2,     2,     2,     2,
       2,     2,     2,     2,     2,     2,     2,     2,     2,     2,
       2,     2,     2,     2,     2,     2,     1,     3,     4,     5,
       6,     7,     8,     9,    10,    11,    12,    13  
  ];

  // YYR1[YYN] -- Symbol number of symbol that rule YYN derives.
  yyr1 = [
       0,    14,    14,    15,    15,    15,    15,    15,    16,    17,
      17,    18,    18,    19,    19,    19,    20,    20,    21,    22,
      22,    23,    23,    24,    25,    25,    26,    26  
  ];

  // YYR2[YYN] -- Number of symbols composing right hand side of rule YYN.
  yyr2 = [
       0,     1,     2,     1,     1,     1,     1,     2,     6,     1,
       2,     1,     2,     1,     2,     1,     1,     2,     4,     1,
       2,     1,     2,     1,     2,     1,     1,     1  
  ];

  // YYDEFACT[S] -- default rule to reduce with in state S when YYTABLE
  // doesn't specify something else to do.  Zero means the default is an
  // error.
  yydefact = [
       0,     0,     0,    25,     0,     0,     9,    21,    26,    27,
       0,     3,     0,     4,    16,     0,     5,     6,     7,    24,
      10,    17,    22,     2,     0,     0,     0,    23,     0,    19,
       0,    11,    13,     0,    15,    18,    20,     0,    12,    14,
       8,     0,     0,     0
    
  ];

  yydefgoto = [
      23,    10,    11,    12,    30,    31,    13,    14,    28,    15,
      29,    16,    17  
  ];

  yypact = [
      29,    14,     5,-32768,    36,     0,-32768,-32768,-32768,-32768,
       2,-32768,    20,-32768,-32768,    25,-32768,-32768,-32768,-32768,
  -32768,-32768,-32768,-32768,     5,    34,     8,-32768,     5,    34,
      42,     8,-32768,    -5,-32768,-32768,-32768,     5,-32768,-32768,
  -32768,    49,    50,-32768

  ];

  yypgoto = [
      51,-32768,-32768,-32768,    21,-32768,-32768,    -3,    24,    12,
  -32768,-32768,    -2  
  ];

  yytable = [
      19,    21,    -1,     1,    25,     2,     3,     8,     9,     4,
       5,    22,     6,     7,     8,     9,     5,     8,     9,     7,
       8,     9,    26,    32,    34,    24,    35,    18,    32,    34,
       1,    39,     2,     3,    25,    40,     4,     5,    33,     6,
       7,     8,     9,    33,     5,    27,    20,     7,    37,    42,
      43,    41,    38,    36
  ];

  yycheck = [
       2,     4,     0,     1,     9,     3,     4,    12,    13,     7,
       8,    11,    10,    11,    12,    13,     8,    12,    13,    11,
      12,    13,    24,    26,    26,     5,    28,    13,    31,    31,
       1,    33,     3,     4,     9,    37,     7,     8,    26,    10,
      11,    12,    13,    31,     8,    11,    10,    11,     6,     0,
       0,     0,    31,    29
  
  ];

  if (YYDEBUG) {
    yyprhs = [
       0,     0,     2,     5,     7,     9,    11,    13,    16,    23,
      25,    28,    30,    33,    35,    38,    40,    42,    45,    50,
      52,    55,    57,    60,    62,    65,    67,    69
    ];
    yyrhs = [
      15,     0,    15,    14,     0,    16,     0,    20,     0,    25,
       0,    26,     0,     1,    13,     0,    17,     5,    26,    18,
       6,    26,     0,    10,     0,     7,    10,     0,    19,     0,
      19,    18,     0,    21,     0,    23,    26,     0,    26,     0,
      21,     0,     7,    21,     0,    23,     9,    22,    26,     0,
      24,     0,    24,    22,     0,    11,     0,     8,    11,     0,
      11,     0,     3,    26,     0,     4,     0,    12,     0,    13,
       0
    ];
    // YYRLINE[YYN] -- source line where rule number YYN was defined.
    yyrline = [
       0,    55,    55,    57,    57,    57,    57,    58,    63,    65,
      70,    76,    76,    78,    82,    86,    88,    92,    97,    99,
      99,   101,   105,   111,   116,   120,   125,   125    
    ];
  }
  
  if (YYDEBUG || YYERROR_VERBOSE) {

    // YYTNAME[TOKEN_NUM] -- String name of the token TOKEN_NUM.
    yytname = [
      "$", "error", "$undefined.", "CTRL_ASSIGN", "CTRL_IGNORE", "OPEN", 
      "CLOSE", "REVERSE", "STARTCLASS", "LET", "TAG", "SYMBOL", "REMARK", 
      "NL", "src", "statement", "block", "tag", "members", "member", "single", 
      "define", "bodies", "head", "body", "contol", "remark", 0  
    ];
  }

  // -*-C-*-  Note some compilers choke on comments on `#line' lines.
  // #line 3 "/usr/share/bison/bison.simple"

  /* Skeleton output parser for bison,
  
     Copyright (C) 1984, 1989, 1990, 2000, 2001, 2002 Free Software
     Foundation, Inc.
  
     This program is free software; you can redistribute it and/or modify
     it under the terms of the GNU General Public License as published by
     the Free Software Foundation; either version 2, or (at your option)
     any later version.
  
     This program is distributed in the hope that it will be useful,
     but WITHOUT ANY WARRANTY; without even the implied warranty of
     MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
     GNU General Public License for more details.
  
     You should have received a copy of the GNU General Public License
     along with this program; if not, write to the Free Software
     Foundation, Inc., 59 Temple Place - Suite 330,
     Boston, MA 02111-1307, USA.  */

  /* As a special exception, when this file is copied by Bison into a
     Bison output file, you may use that output file without restriction.
     This special exception was added by the Free Software Foundation
     in version 1.24 of Bison.  */
  
  /* This is the parser code that is written into each bison parser when
     the %semantic_parser declaration is not specified in the grammar.
     It was written by Richard Stallman by simplifying the hairy parser
     used when %semantic_parser is specified.  */
  
  /* All symbols defined below should begin with yy or YY, to avoid
     infringing on user name space.  This should be done even for local
     variables, as they might otherwise be expanded by user macros.
     There are some unavoidable exceptions within include files to
     define necessary library symbols; they are noted "INFRINGES ON
     USER NAME SPACE" below.  */

  // ---------------------------- MEMORY ---------------------------------------

  if (yyoverflow !== undefined && (__cplusplus !== undefined || (YYLTYPE_IS_TRIVIAL && YYSTYPE_IS_TRIVIAL))) {

    // XXX declare allocator here

    
    // A type that is properly aligned for any stack member
    // Union stores one different types in same type and memory
    // XXX: mh no...
    function yyalloc (yyss, yyvs, yyls) {
      truc = {
        "short": yyss,
        "YYSTYPE": yyvs
      };
      if (YYLSP_NEEDED) {
        truc.YYLTYPE = yyls;
      }
      return truc;
    };
    
    // The size of the maximum gap between one aligned stack and the next.
    // XXX: make one, set the size...
    // YYSTACK_GAP_MAX = allocator.sizeof(yyalloc - 1);
    
    // Size of array large to enough to hold all stacks, each with N elements.
    if (YYLSP_NEEDED) {
      YYSTACK_BYTES = function(N) {
        return N * (short.byteLength + allocator,sizeof(YYSTYPE) + 
          allocator.sizeof(YYLTYPE)) + 2 * YYSTACK_GAP_MAX;
      }
    } else {
      YYSTACK_BYTES = function(N) {
        return N * (short.byteLength + allocator,sizeof(YYSTYPE)) + 
          YYSTACK_GAP_MAX;
      }
    }
    
    // Copy STACK COUNT objects FROM to TO. source and destination don't overlap
    // XXX uhm, now what?
    if (YYCOPY === undefined) {
      if (1 < __GNUC__) {
        YYCOPY = function (To, From, Count) {
          __builtin_memcpy(To, From, (Count) * allocator.sizeof(*(From)));
        }
      } else {
        YYCOPY = function (To, From, Count) {
          //do {
          for (yyi = 0; yyi < Count; yyi += 1) {
            To[yyi] = From[yyi];
          }
          YYSIZE_T = yyi; // XXX what for?
          //} while (0);
        }
      }
    }
    
    // Relocate STACK from its old location to the new one. The local variables 
    // YYSIZE and YYSTACKSIZE give the old and new number of elements in the 
    // stack, and YYPTR gives the new location of the stack. Advance YYPTR to 
    // a properly aligned location for the next stack.
    YYSTACK_RELOCATE = function (Stack) {
      // do {
      var yysize,
        yystacksize;

      // XXX hm in theory
      YYCOPY(yyptr[Stack], Stack, yysize);
      Stack = yyptr[Stack]; // XXX what for?
      yynewbytes = yystacksize * allocator.sizeof(Stack) + YYSTACK_GAP_MAX;
      YYSIZE_T = yynewbytes;
      yyptr = yyptr + yynewbytes / allocator.sizeof(yyptr)
      // } while (0);
    }
  }

  if (yyoverflow === undefined || YYERROR_VERBOSE) {

    // The parser invokes alloca or malloc; define the necessary symbols.
    //if (YYSTACK_USE_ALLOCA) {
    //  YYSTACK_ALLOC = allocator.alloc;
    //} else {
    //  if (...) {
    //    YYSTACK_ALLOC = allocator.alloc;
    //  }
    //}
    
    // size_t 64bit max unsigned 65535?
    // Pacify GCC's `empty if-body' warning.
    //if (YYSTACK_ALLOC) {
    //  YYSTACK_FREE = function (pointer) {
    //    do {/* empty */} while 0;
    //  }
    //} else {
    //  if (__STDC__ || __cplusplus) {
    //    YYSIZE_T = size_t;
    //  }
      YYSTACK_ALLOC = allocator.alloc;
      YYSTACK_FREE = allocator.free;
    //}
  }
  
  // really really really make sure YYSIZE_T is defined
  //if (YYSIZE_T === undefined && __SIZE_TYPE__) {
  //  YYSIZE_T = __SIZE_TYPE__;
  //}
  //if (YYSIZE_T === undefined && size_t) {
  //  YYSIZE_T = size_t;
  //}
  //if (YYSIZE_T === undefined) {
  //  if (__STDC__) || __cplusplus) {
  //    YYSIZE_T = size_t;
  //  }
  //} 
  if (YYSIZE_T === undefined) {
    YYSIZE_T = unsigned_int.byteLength;
  }

  // ---------------------------- "ROUTING" ------------------------------------
  yyerrok = function () {
    yyerrstatus = 0;
  }
  yyclearin = function () {
    yychar = YYEMPTY;
  }
  // YYTRANSLATE(YYLEX) -- Bison token number corresponding to YYLEX.
  YYTRANSLATE = function(x) {
    if (x <= 267) {    // XXX unsigned(x)
      return yytranslate[x];
    }
    return 27;
  }
  YYACCEPT = function () {
    yyacceptlab();
  }
  YYABORT = function () {
    yyabortlab();
  }
  YYERROR = function () {
    yyerrlab1();
  }
  yyerror = function(my_message) {
    error_count++;
    console.log("[yyerror] (#:" + error_count + "): " + my_message);
    //return 0;
  }

  // Like YYERROR except do call yyerror.  This remains here temporarily
  // to ease the transition to the new meaning of YYERROR, for GCC.
  // Once GCC version 2 has supplanted version 1, this can go
  YYFAIL = function () {
    yyerrlab();
  }
  YYRECOVERING = function () {
    return !!yyerrstatus;
  }
  YYBACKUP = function (Token, Value) {
    // do {
    if (yychar === YYEMPTY && yylen === 1) {
      yychar = Token;
      yylval = Value;
      yychar1 = YYTRANSLATE(yychar);
      YYPOPSTACK();
      yybackup();
    } else {
      yyerror("Syntax error: Cannot back up.");
      YYERROR();
    }
    // } while (0);
  }









/* YYLLOC_DEFAULT -- Compute the default location (before the actions
   are run).

   When YYLLOC_DEFAULT is run, CURRENT is set the location of the
   first token.  By default, to implement support for ranges, extend
   its range to the last symbol.  */

#ifndef YYLLOC_DEFAULT
# define YYLLOC_DEFAULT(Current, Rhs, N)       	\
   Current.last_line   = Rhs[N].last_line;	\
   Current.last_column = Rhs[N].last_column;
#endif


/* YYLEX -- calling `yylex' with the right arguments.  */

#if YYPURE
# if YYLSP_NEEDED
#  ifdef YYLEX_PARAM
#   define YYLEX		yylex (&yylval, &yylloc, YYLEX_PARAM)
#  else
#   define YYLEX		yylex (&yylval, &yylloc)
#  endif
# else /* !YYLSP_NEEDED */
#  ifdef YYLEX_PARAM
#   define YYLEX		yylex (&yylval, YYLEX_PARAM)
#  else
#   define YYLEX		yylex (&yylval)
#  endif
# endif /* !YYLSP_NEEDED */
#else /* !YYPURE */
# define YYLEX			yylex ()
#endif /* !YYPURE */


/* Enable debugging if requested.  */
#if YYDEBUG

# ifndef YYFPRINTF
#  include <stdio.h> /* INFRINGES ON USER NAME SPACE */
#  define YYFPRINTF fprintf
# endif

# define YYDPRINTF(Args)			\
do {						\
  if (yydebug)					\
    YYFPRINTF Args;				\
} while (0)
/* Nonzero means print parse trace.  It is left uninitialized so that
   multiple parsers can coexist.  */
int yydebug;
#else /* !YYDEBUG */
# define YYDPRINTF(Args)
#endif /* !YYDEBUG */

/* YYINITDEPTH -- initial size of the parser's stacks.  */
#ifndef	YYINITDEPTH
# define YYINITDEPTH 200
#endif

/* YYMAXDEPTH -- maximum size the stacks can grow to (effective only
   if the built-in stack extension method is used).

   Do not make this value too large; the results are undefined if
   SIZE_MAX < YYSTACK_BYTES (YYMAXDEPTH)
   evaluated with infinite-precision integer arithmetic.  */

#if YYMAXDEPTH == 0
# undef YYMAXDEPTH
#endif

#ifndef YYMAXDEPTH
# define YYMAXDEPTH 10000
#endif

#ifdef YYERROR_VERBOSE

# ifndef yystrlen
#  if defined (__GLIBC__) && defined (_STRING_H)
#   define yystrlen strlen
#  else
/* Return the length of YYSTR.  */
static YYSIZE_T
#   if defined (__STDC__) || defined (__cplusplus)
yystrlen (const char *yystr)
#   else
yystrlen (yystr)
     const char *yystr;
#   endif
{
  register const char *yys = yystr;

  while (*yys++ != '\0')
    continue;

  return yys - yystr - 1;
}
#  endif
# endif

# ifndef yystpcpy
#  if defined (__GLIBC__) && defined (_STRING_H) && defined (_GNU_SOURCE)
#   define yystpcpy stpcpy
#  else
/* Copy YYSRC to YYDEST, returning the address of the terminating '\0' in
   YYDEST.  */
static char *
#   if defined (__STDC__) || defined (__cplusplus)
yystpcpy (char *yydest, const char *yysrc)
#   else
yystpcpy (yydest, yysrc)
     char *yydest;
     const char *yysrc;
#   endif
{
  register char *yyd = yydest;
  register const char *yys = yysrc;

  while ((*yyd++ = *yys++) != '\0')
    continue;

  return yyd - 1;
}
#  endif
# endif
#endif

#line 315 "/usr/share/bison/bison.simple"


/* The user can define YYPARSE_PARAM as the name of an argument to be passed
   into yyparse.  The argument should have type void *.
   It should actually point to an object.
   Grammar actions can access the variable by casting it
   to the proper pointer type.  */

#ifdef YYPARSE_PARAM
# if defined (__STDC__) || defined (__cplusplus)
#  define YYPARSE_PARAM_ARG void *YYPARSE_PARAM
#  define YYPARSE_PARAM_DECL
# else
#  define YYPARSE_PARAM_ARG YYPARSE_PARAM
#  define YYPARSE_PARAM_DECL void *YYPARSE_PARAM;
# endif
#else /* !YYPARSE_PARAM */
# define YYPARSE_PARAM_ARG
# define YYPARSE_PARAM_DECL
#endif /* !YYPARSE_PARAM */

/* Prevent warning if -Wstrict-prototypes.  */
#ifdef __GNUC__
# ifdef YYPARSE_PARAM
int yyparse (void *);
# else
int yyparse (void);
# endif
#endif

/* YY_DECL_VARIABLES -- depending whether we use a pure parser,
   variables are global, or local to YYPARSE.  */

#define YY_DECL_NON_LSP_VARIABLES			\
/* The lookahead symbol.  */				\
int yychar;						\
							\
/* The semantic value of the lookahead symbol. */	\
YYSTYPE yylval;						\
							\
/* Number of parse errors so far.  */			\
int yynerrs;

#if YYLSP_NEEDED
# define YY_DECL_VARIABLES			\
YY_DECL_NON_LSP_VARIABLES			\
						\
/* Location data for the lookahead symbol.  */	\
YYLTYPE yylloc;
#else
# define YY_DECL_VARIABLES			\
YY_DECL_NON_LSP_VARIABLES
#endif


/* If nonreentrant, generate the variables here. */

#if !YYPURE
YY_DECL_VARIABLES
#endif  /* !YYPURE */

int
yyparse (YYPARSE_PARAM_ARG)
     YYPARSE_PARAM_DECL
{
  /* If reentrant, generate the variables here. */
#if YYPURE
  YY_DECL_VARIABLES
#endif  /* !YYPURE */

  register int yystate;
  register int yyn;
  int yyresult;
  /* Number of tokens to shift before error messages enabled.  */
  int yyerrstatus;
  /* Lookahead token as an internal (translated) token number.  */
  int yychar1 = 0;

  /* Three stacks and their tools:
     `yyss': related to states,
     `yyvs': related to semantic values,
     `yyls': related to locations.

     Refer to the stacks thru separate pointers, to allow yyoverflow
     to reallocate them elsewhere.  */

  /* The state stack. */
  short	yyssa[YYINITDEPTH];
  short *yyss = yyssa;
  register short *yyssp;

  /* The semantic value stack.  */
  YYSTYPE yyvsa[YYINITDEPTH];
  YYSTYPE *yyvs = yyvsa;
  register YYSTYPE *yyvsp;

#if YYLSP_NEEDED
  /* The location stack.  */
  YYLTYPE yylsa[YYINITDEPTH];
  YYLTYPE *yyls = yylsa;
  YYLTYPE *yylsp;
#endif

#if YYLSP_NEEDED
# define YYPOPSTACK   (yyvsp--, yyssp--, yylsp--)
#else
# define YYPOPSTACK   (yyvsp--, yyssp--)
#endif

  YYSIZE_T yystacksize = YYINITDEPTH;


  /* The variables used to return semantic value and location from the
     action routines.  */
  YYSTYPE yyval;
#if YYLSP_NEEDED
  YYLTYPE yyloc;
#endif

  /* When reducing, the number of symbols on the RHS of the reduced
     rule. */
  int yylen;

  YYDPRINTF ((stderr, "Starting parse\n"));

  yystate = 0;
  yyerrstatus = 0;
  yynerrs = 0;
  yychar = YYEMPTY;		/* Cause a token to be read.  */

  /* Initialize stack pointers.
     Waste one element of value and location stack
     so that they stay on the same level as the state stack.
     The wasted elements are never initialized.  */

  yyssp = yyss;
  yyvsp = yyvs;
#if YYLSP_NEEDED
  yylsp = yyls;
#endif
  goto yysetstate;

/*------------------------------------------------------------.
| yynewstate -- Push a new state, which is found in yystate.  |
`------------------------------------------------------------*/
 yynewstate:
  /* In all cases, when you get here, the value and location stacks
     have just been pushed. so pushing a state here evens the stacks.
     */
  yyssp++;

 yysetstate:
  *yyssp = yystate;

  if (yyssp >= yyss + yystacksize - 1)
    {
      /* Get the current used size of the three stacks, in elements.  */
      YYSIZE_T yysize = yyssp - yyss + 1;

#ifdef yyoverflow
      {
	/* Give user a chance to reallocate the stack. Use copies of
	   these so that the &'s don't force the real ones into
	   memory.  */
	YYSTYPE *yyvs1 = yyvs;
	short *yyss1 = yyss;

	/* Each stack pointer address is followed by the size of the
	   data in use in that stack, in bytes.  */
# if YYLSP_NEEDED
	YYLTYPE *yyls1 = yyls;
	/* This used to be a conditional around just the two extra args,
	   but that might be undefined if yyoverflow is a macro.  */
	yyoverflow ("parser stack overflow",
		    &yyss1, yysize * sizeof (*yyssp),
		    &yyvs1, yysize * sizeof (*yyvsp),
		    &yyls1, yysize * sizeof (*yylsp),
		    &yystacksize);
	yyls = yyls1;
# else
	yyoverflow ("parser stack overflow",
		    &yyss1, yysize * sizeof (*yyssp),
		    &yyvs1, yysize * sizeof (*yyvsp),
		    &yystacksize);
# endif
	yyss = yyss1;
	yyvs = yyvs1;
      }
#else /* no yyoverflow */
# ifndef YYSTACK_RELOCATE
      goto yyoverflowlab;
# else
      /* Extend the stack our own way.  */
      if (yystacksize >= YYMAXDEPTH)
	goto yyoverflowlab;
      yystacksize *= 2;
      if (yystacksize > YYMAXDEPTH)
	yystacksize = YYMAXDEPTH;

      {
	short *yyss1 = yyss;
	union yyalloc *yyptr =
	  (union yyalloc *) YYSTACK_ALLOC (YYSTACK_BYTES (yystacksize));
	if (! yyptr)
	  goto yyoverflowlab;
	YYSTACK_RELOCATE (yyss);
	YYSTACK_RELOCATE (yyvs);
# if YYLSP_NEEDED
	YYSTACK_RELOCATE (yyls);
# endif
# undef YYSTACK_RELOCATE
	if (yyss1 != yyssa)
	  YYSTACK_FREE (yyss1);
      }
# endif
#endif /* no yyoverflow */

      yyssp = yyss + yysize - 1;
      yyvsp = yyvs + yysize - 1;
#if YYLSP_NEEDED
      yylsp = yyls + yysize - 1;
#endif

      YYDPRINTF ((stderr, "Stack size increased to %lu\n",
		  (unsigned long int) yystacksize));

      if (yyssp >= yyss + yystacksize - 1)
	YYABORT;
    }

  YYDPRINTF ((stderr, "Entering state %d\n", yystate));

  goto yybackup;


/*-----------.
| yybackup.  |
`-----------*/
yybackup:

/* Do appropriate processing given the current state.  */
/* Read a lookahead token if we need one and don't already have one.  */
/* yyresume: */

  /* First try to decide what to do without reference to lookahead token.  */

  yyn = yypact[yystate];
  if (yyn == YYFLAG)
    goto yydefault;

  /* Not known => get a lookahead token if don't already have one.  */

  /* yychar is either YYEMPTY or YYEOF
     or a valid token in external form.  */

  if (yychar == YYEMPTY)
    {
      YYDPRINTF ((stderr, "Reading a token: "));
      yychar = YYLEX;
    }

  /* Convert token to internal form (in yychar1) for indexing tables with */

  if (yychar <= 0)		/* This means end of input. */
    {
      yychar1 = 0;
      yychar = YYEOF;		/* Don't call YYLEX any more */

      YYDPRINTF ((stderr, "Now at end of input.\n"));
    }
  else
    {
      yychar1 = YYTRANSLATE (yychar);

#if YYDEBUG
     /* We have to keep this `#if YYDEBUG', since we use variables
	which are defined only if `YYDEBUG' is set.  */
      if (yydebug)
	{
	  YYFPRINTF (stderr, "Next token is %d (%s",
		     yychar, yytname[yychar1]);
	  /* Give the individual parser a way to print the precise
	     meaning of a token, for further debugging info.  */
# ifdef YYPRINT
	  YYPRINT (stderr, yychar, yylval);
# endif
	  YYFPRINTF (stderr, ")\n");
	}
#endif
    }

  yyn += yychar1;
  if (yyn < 0 || yyn > YYLAST || yycheck[yyn] != yychar1)
    goto yydefault;

  yyn = yytable[yyn];

  /* yyn is what to do for this token type in this state.
     Negative => reduce, -yyn is rule number.
     Positive => shift, yyn is new state.
       New state is final state => don't bother to shift,
       just return success.
     0, or most negative number => error.  */

  if (yyn < 0)
    {
      if (yyn == YYFLAG)
	goto yyerrlab;
      yyn = -yyn;
      goto yyreduce;
    }
  else if (yyn == 0)
    goto yyerrlab;

  if (yyn == YYFINAL)
    YYACCEPT;

  /* Shift the lookahead token.  */
  YYDPRINTF ((stderr, "Shifting token %d (%s), ",
	      yychar, yytname[yychar1]));

  /* Discard the token being shifted unless it is eof.  */
  if (yychar != YYEOF)
    yychar = YYEMPTY;

  *++yyvsp = yylval;
#if YYLSP_NEEDED
  *++yylsp = yylloc;
#endif

  /* Count tokens shifted since error; after three, turn off error
     status.  */
  if (yyerrstatus)
    yyerrstatus--;

  yystate = yyn;
  goto yynewstate;


/*-----------------------------------------------------------.
| yydefault -- do the default action for the current state.  |
`-----------------------------------------------------------*/
yydefault:
  yyn = yydefact[yystate];
  if (yyn == 0)
    goto yyerrlab;
  goto yyreduce;


/*-----------------------------.
| yyreduce -- Do a reduction.  |
`-----------------------------*/
yyreduce:
  /* yyn is the number of a rule to reduce with.  */
  yylen = yyr2[yyn];

  /* If YYLEN is nonzero, implement the default value of the action:
     `$$ = $1'.

     Otherwise, the following line sets YYVAL to the semantic value of
     the lookahead token.  This behavior is undocumented and Bison
     users should not rely upon it.  Assigning to YYVAL
     unconditionally makes the parser a bit smaller, and it avoids a
     GCC warning that YYVAL may be used uninitialized.  */
  yyval = yyvsp[1-yylen];

#if YYLSP_NEEDED
  /* Similarly for the default location.  Let the user run additional
     commands if for instance locations are ranges.  */
  yyloc = yylsp[1-yylen];
  YYLLOC_DEFAULT (yyloc, (yylsp - yylen), yylen);
#endif

#if YYDEBUG
  /* We have to keep this `#if YYDEBUG', since we use variables which
     are defined only if `YYDEBUG' is set.  */
  if (yydebug)
    {
      int yyi;

      YYFPRINTF (stderr, "Reducing via rule %d (line %d), ",
		 yyn, yyrline[yyn]);

      /* Print the symbols being reduced, and their result.  */
      for (yyi = yyprhs[yyn]; yyrhs[yyi] > 0; yyi++)
	YYFPRINTF (stderr, "%s ", yytname[yyrhs[yyi]]);
      YYFPRINTF (stderr, " -> %s\n", yytname[yyr1[yyn]]);
    }
#endif

  switch (yyn) {

case 7:
#line 59 "gram.y"
{
    yyerrok;
;
    break;}
case 9:
#line 66 "gram.y"
{
    BlockReverseSw = 0;
    if( ModeAssignAccptFlag ) outputHeader( yyvsp[0] );
;
    break;}
case 10:
#line 71 "gram.y"
{
    BlockReverseSw = 1;
    if( !ModeAssignAccptFlag ) outputHeader( yyvsp[0] );
;
    break;}
case 13:
#line 79 "gram.y"
{
    appendNonTerm( HeadName, ModeAssignAccptFlag ^ BlockReverseSw );
;
    break;}
case 14:
#line 83 "gram.y"
{
    entryNonTerm( HeadName, NULL, ModeAssignAccptFlag ^ BlockReverseSw, 0, 1, 0 ); /*空登録*/
;
    break;}
case 16:
#line 89 "gram.y"
{
    appendNonTerm( HeadName, ModeAssignAccptFlag );
;
    break;}
case 17:
#line 93 "gram.y"
{
    appendNonTerm( HeadName, !ModeAssignAccptFlag );
;
    break;}
case 21:
#line 102 "gram.y"
{
    strcpy( HeadName, yyvsp[0] );
;
    break;}
case 22:
#line 106 "gram.y"
{
    StartFlag = 1;
    strcpy( HeadName, yyvsp[0] );
;
    break;}
case 23:
#line 112 "gram.y"
{
    strcpy( BodyName[ BodyNo++ ], yyvsp[0] );
;
    break;}
case 24:
#line 117 "gram.y"
{
    ModeAssignAccptFlag = 1;
;
    break;}
case 25:
#line 121 "gram.y"
{
    ModeAssignAccptFlag = 0;
;
    break;}
}

#line 705 "/usr/share/bison/bison.simple"


  yyvsp -= yylen;
  yyssp -= yylen;
#if YYLSP_NEEDED
  yylsp -= yylen;
#endif

#if YYDEBUG
  if (yydebug)
    {
      short *yyssp1 = yyss - 1;
      YYFPRINTF (stderr, "state stack now");
      while (yyssp1 != yyssp)
	YYFPRINTF (stderr, " %d", *++yyssp1);
      YYFPRINTF (stderr, "\n");
    }
#endif

  *++yyvsp = yyval;
#if YYLSP_NEEDED
  *++yylsp = yyloc;
#endif

  /* Now `shift' the result of the reduction.  Determine what state
     that goes to, based on the state we popped back to and the rule
     number reduced by.  */

  yyn = yyr1[yyn];

  yystate = yypgoto[yyn - YYNTBASE] + *yyssp;
  if (yystate >= 0 && yystate <= YYLAST && yycheck[yystate] == *yyssp)
    yystate = yytable[yystate];
  else
    yystate = yydefgoto[yyn - YYNTBASE];

  goto yynewstate;


/*------------------------------------.
| yyerrlab -- here on detecting error |
`------------------------------------*/
yyerrlab:
  /* If not already recovering from an error, report this error.  */
  if (!yyerrstatus)
    {
      ++yynerrs;

#ifdef YYERROR_VERBOSE
      yyn = yypact[yystate];

      if (yyn > YYFLAG && yyn < YYLAST)
	{
	  YYSIZE_T yysize = 0;
	  char *yymsg;
	  int yyx, yycount;

	  yycount = 0;
	  /* Start YYX at -YYN if negative to avoid negative indexes in
	     YYCHECK.  */
	  for (yyx = yyn < 0 ? -yyn : 0;
	       yyx < (int) (sizeof (yytname) / sizeof (char *)); yyx++)
	    if (yycheck[yyx + yyn] == yyx)
	      yysize += yystrlen (yytname[yyx]) + 15, yycount++;
	  yysize += yystrlen ("parse error, unexpected ") + 1;
	  yysize += yystrlen (yytname[YYTRANSLATE (yychar)]);
	  yymsg = (char *) YYSTACK_ALLOC (yysize);
	  if (yymsg != 0)
	    {
	      char *yyp = yystpcpy (yymsg, "parse error, unexpected ");
	      yyp = yystpcpy (yyp, yytname[YYTRANSLATE (yychar)]);

	      if (yycount < 5)
		{
		  yycount = 0;
		  for (yyx = yyn < 0 ? -yyn : 0;
		       yyx < (int) (sizeof (yytname) / sizeof (char *));
		       yyx++)
		    if (yycheck[yyx + yyn] == yyx)
		      {
			const char *yyq = ! yycount ? ", expecting " : " or ";
			yyp = yystpcpy (yyp, yyq);
			yyp = yystpcpy (yyp, yytname[yyx]);
			yycount++;
		      }
		}
	      yyerror (yymsg);
	      YYSTACK_FREE (yymsg);
	    }
	  else
	    yyerror ("parse error; also virtual memory exhausted");
	}
      else
#endif /* defined (YYERROR_VERBOSE) */
	yyerror ("parse error");
    }
  goto yyerrlab1;


/*--------------------------------------------------.
| yyerrlab1 -- error raised explicitly by an action |
`--------------------------------------------------*/
yyerrlab1:
  if (yyerrstatus == 3)
    {
      /* If just tried and failed to reuse lookahead token after an
	 error, discard it.  */

      /* return failure if at end of input */
      if (yychar == YYEOF)
	YYABORT;
      YYDPRINTF ((stderr, "Discarding token %d (%s).\n",
		  yychar, yytname[yychar1]));
      yychar = YYEMPTY;
    }

  /* Else will try to reuse lookahead token after shifting the error
     token.  */

  yyerrstatus = 3;		/* Each real token shifted decrements this */

  goto yyerrhandle;


/*-------------------------------------------------------------------.
| yyerrdefault -- current state does not do anything special for the |
| error token.                                                       |
`-------------------------------------------------------------------*/
yyerrdefault:
#if 0
  /* This is wrong; only states that explicitly want error tokens
     should shift them.  */

  /* If its default is to accept any token, ok.  Otherwise pop it.  */
  yyn = yydefact[yystate];
  if (yyn)
    goto yydefault;
#endif


/*---------------------------------------------------------------.
| yyerrpop -- pop the current state because it cannot handle the |
| error token                                                    |
`---------------------------------------------------------------*/
yyerrpop:
  if (yyssp == yyss)
    YYABORT;
  yyvsp--;
  yystate = *--yyssp;
#if YYLSP_NEEDED
  yylsp--;
#endif

#if YYDEBUG
  if (yydebug)
    {
      short *yyssp1 = yyss - 1;
      YYFPRINTF (stderr, "Error: state stack now");
      while (yyssp1 != yyssp)
	YYFPRINTF (stderr, " %d", *++yyssp1);
      YYFPRINTF (stderr, "\n");
    }
#endif

/*--------------.
| yyerrhandle.  |
`--------------*/
yyerrhandle:
  yyn = yypact[yystate];
  if (yyn == YYFLAG)
    goto yyerrdefault;

  yyn += YYTERROR;
  if (yyn < 0 || yyn > YYLAST || yycheck[yyn] != YYTERROR)
    goto yyerrdefault;

  yyn = yytable[yyn];
  if (yyn < 0)
    {
      if (yyn == YYFLAG)
	goto yyerrpop;
      yyn = -yyn;
      goto yyreduce;
    }
  else if (yyn == 0)
    goto yyerrpop;

  if (yyn == YYFINAL)
    YYACCEPT;

  YYDPRINTF ((stderr, "Shifting error token, "));

  *++yyvsp = yylval;
#if YYLSP_NEEDED
  *++yylsp = yylloc;
#endif

  yystate = yyn;
  goto yynewstate;


/*-------------------------------------.
| yyacceptlab -- YYACCEPT comes here.  |
`-------------------------------------*/
yyacceptlab:
  yyresult = 0;
  goto yyreturn;

/*-----------------------------------.
| yyabortlab -- YYABORT comes here.  |
`-----------------------------------*/
yyabortlab:
  yyresult = 1;
  goto yyreturn;

/*---------------------------------------------.
| yyoverflowab -- parser overflow comes here.  |
`---------------------------------------------*/
yyoverflowlab:
  yyerror ("parser stack overflow");
  yyresult = 2;
  /* Fall through.  */

yyreturn:
#ifndef yyoverflow
  if (yyss != yyssa)
    YYSTACK_FREE (yyss);
#endif
  return yyresult;
}

  // ---------------------------- The rest -------------------------------------
  
  function checkNoInstantClass() {
    var current_class = CLASS_LIST;
    while (current_class !== null) {
      if (current_class.branch === undefined) {
        return current_class.name;
      }
      current_class = current_class.next;
    }
    return null;
  }

  function getNewClassName(my_key_name) {
    var tmp_class_count = 0,
      class_name = my_key_name + "#" + tmp_class_count;

    if (!SW_SEMI_COMPAT) {
      console.log("Now modifying grammar to minimize states[", grammar_modification_number + "]");
      NO_NEW_LINE = 1;
    }
    grammar_modification_number++;
    return (1);
  }

  function unifyBody(my_class_name, my_body, my_new_body) {
    var body_next,
      new_body_next,
      body_class,
      new_body,
      new_class_name;
      
    body_next = my_body.next;
    new_body_next = my_new_body.next;

    while (1) {
      if (body_next === null && new_body_next === null) {
        return -1;
      }
      if (new_body_next === null) {
        if (my_body.abort) {
          return -1;
        } else {
          my_body.abort = 1;
        }
        return 0;
      }
      if (body_next === null) {
        my_body.abort = 1;
        my_body.next = new_body_next;
        return 0;
      }
      if (body_next.name === new_body_next.name) {
        break;
      }
      my_body = body_next;
      my_new_body = new_body_next;
      body_next = body.next;
      new_body_next = new_body.next;
    }

    body_class = createBodyClass(); // ?
    if (body_class !== null && body_class.tmp) {
      enterNonTerminalSymbol(my_body.name, new_body_next, 0, 0, 0, 1);
    } else {
      new_class_name = getNewClassName(my_class_name);
      enterNonTerminalSymbol(new_class_name, body_next, 0, 0, 0, 1);
      enterNonTerminalSymbol(new_class_name, new_body_next, 0, 0, 0, 1);
      my_new_body.name = new_class_name;
      my_new_body.abort = 0;
      my_new_body.next = null;
      my_body.next = newBody;
      body_next.next = body_next;
    }
    return 0;
  }

  function pushBody(my_body_class, my_new_body) {
    var body_list = my_body_class.body_list,
      pre_body_list = null,
      new_body_list,
      body,
      cmp,
      define_number = 1;
    
    while (body_list !== null) {
      body = body_list.body;
      cmp = body.name === my_new_body.name;
      if (cmp > 0) {
        break;
      }
      if (cmp === 0) {
        if (unifyBody(body_class.name, body, my_new_body)) {
          console.warn("Redefining class: ", body_class.name, body.name);
        }
        return;
      }
      pre_body_list = body_list;
      body_list = body_list.next;
      define_number++;
    }
    new_body_list.body = new_body;
    if (pre_body_list !== null) {
      pre_body_list.next = new_body_list;
    } else {
      body_class.body_list = new_body_list;
    }
    new_body_list.next = body_list;
    body_class.branch++;
  }

  function outputHeader(my_name) {
    if (class_count >= body_class_flag_max) {
      if (SW_COMPAT_I) {
        console.warn("Class accepted flag overflow, " + my_name);
      }
    } else {
      if (SW_COMPAT_I === undefined) {
        FP_HEADER.push("#define ACCEPT_" + my_name + "0x%08x\n",  1 << class_count );
      }
      current_class_count = class_count++;
    }
  }

  function enterNonTerminalSymbol(my_name, my_body, my_mode_accept, my_start, my_member, my_tmp) {
    var body_class = createBodyClass();
    
    // when does this happen? initial?
    if (body_class === null) {
      if (my_member) {
        error_count++;
        throw Error("Accepted fla of class is reassigned:", head_name);
      }
    } else {
      body_class.name = my_name;
      if (my_mode_accept) {
        if (my_member) {
          body_class.number = current_class_count;
        } else {
          if (!my_tmp) {
            outputHeader(name);
            body_class.number = current_class_count;
          }
        }
      } else {
        body_class.number = -1;
      }
      body_class.branch = 0;
      body_class.used_finite_automaton = 0;
      body_class.used = 1; // non-terminal does not appear in voca
      body_class.body_list = null;
      body_class.tmp = tmp;
      body_class.next = null;
      if (CLASS_LIST_TAIL === null) {
        CLASS_LIST = body_class;
      } else {
        CLASS_LIST_TAIL.next = body_class;
      }
      CLASS_LIST_TAIL = body_class;
    }
    if (my_body === null) {
      pushBody(body_class, my_body);
      if (my_start) {
        body_class_flag_start = 0;
        if (START_SYMBOL === null) {
          START_SYMBOL = body_class;
        } else {
          error_count++;
          throw Error("Start symbol is redefined: ", body_class.name);
        }
      }
    }
    return body_class;
  }

  function configureNonTerminalSymbol(my_body) {
    var first_body = null,
      previous_body = null,
      i;
    for (i = 0; i < body_count; i += 1) {
      my_body.name = body_name[i];
      my_body.abort = 0;
      if (previous_body !== null) {
        previous_body.next = my_body;
      } else {
        first_body = my_body;
      }
      previous_body = my_body;
    }
    my_body.next = null;
    return first_body;
  }

  function appendNonTerminalSymbol(my_name, my_mode_assign) {
    var body = configureNonTerminalSymbol(createBody());
    enterNonTerminalSymbol(my_name, body, my_mode_assign, body_class_flag_start, is_block_start_or_end, 0);
    body_count = 0;
  }

}());


