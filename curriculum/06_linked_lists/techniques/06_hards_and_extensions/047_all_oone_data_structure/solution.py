from __future__ import annotations


class _Bucket:
    def __init__(self, count: int) -> None:
        self.count = count
        self.keys: set[str] = set()
        self.prev: _Bucket | None = None
        self.next: _Bucket | None = None


class AllOne:
    # Problem 47: All O`one Data Structure

    def __init__(self) -> None:
        # Time: O(1)
        # Space: O(1)
        self.head = _Bucket(0)
        self.tail = _Bucket(0)
        self.head.next = self.tail
        self.tail.prev = self.head
        self.key_to_bucket: dict[str, _Bucket] = {}

    def _insert_after(self, prev: _Bucket, bucket: _Bucket) -> None:
        nxt = prev.next
        assert nxt is not None
        prev.next = bucket
        bucket.prev = prev
        bucket.next = nxt
        nxt.prev = bucket

    def _remove(self, bucket: _Bucket) -> None:
        prev = bucket.prev
        nxt = bucket.next
        assert prev is not None and nxt is not None
        prev.next = nxt
        nxt.prev = prev

    def _move_key(self, key: str, from_bucket: _Bucket | None, to_count: int, after: _Bucket) -> None:
        to_bucket = after.next
        if to_bucket is None or to_bucket.count != to_count:
            to_bucket = _Bucket(to_count)
            self._insert_after(after, to_bucket)
        to_bucket.keys.add(key)
        self.key_to_bucket[key] = to_bucket

        if from_bucket is not None:
            from_bucket.keys.remove(key)
            if not from_bucket.keys:
                self._remove(from_bucket)

    def inc(self, key: str) -> None:
        # Time: O(1)
        # Space: O(1)
        if key in self.key_to_bucket:
            bucket = self.key_to_bucket[key]
            self._move_key(key, bucket, bucket.count + 1, bucket)
        else:
            self._move_key(key, None, 1, self.head)

    def dec(self, key: str) -> None:
        # Time: O(1)
        # Space: O(1)
        bucket = self.key_to_bucket[key]
        if bucket.count == 1:
            bucket.keys.remove(key)
            del self.key_to_bucket[key]
            if not bucket.keys:
                self._remove(bucket)
        else:
            prev = bucket.prev
            assert prev is not None
            self._move_key(key, bucket, bucket.count - 1, prev)

    def get_max_key(self) -> str:
        # Time: O(1)
        # Space: O(1)
        bucket = self.tail.prev
        assert bucket is not None
        if bucket is self.head:
            return ""
        return next(iter(bucket.keys))

    def get_min_key(self) -> str:
        # Time: O(1)
        # Space: O(1)
        bucket = self.head.next
        assert bucket is not None
        if bucket is self.tail:
            return ""
        return next(iter(bucket.keys))
