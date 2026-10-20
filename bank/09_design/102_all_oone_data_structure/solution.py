from __future__ import annotations


class _Bucket:
    def __init__(self, count: int) -> None:
        self.count = count
        self.keys: set[str] = set()
        self.prev: _Bucket | None = None
        self.next: _Bucket | None = None


class AllOne:
    def __init__(self) -> None:
        self.head = _Bucket(0)
        self.tail = _Bucket(0)
        self.head.next = self.tail
        self.tail.prev = self.head
        self.where: dict[str, _Bucket] = {}

    def _insert_after(self, node: _Bucket, count: int) -> _Bucket:
        new = _Bucket(count)
        nxt = node.next
        new.prev, new.next = node, nxt
        node.next = new
        if nxt is not None:
            nxt.prev = new
        return new

    def _remove_if_empty(self, node: _Bucket) -> None:
        if node.keys or node is self.head or node is self.tail:
            return
        prev, nxt = node.prev, node.next
        if prev is not None:
            prev.next = nxt
        if nxt is not None:
            nxt.prev = prev

    def inc(self, key: str) -> None:
        cur = self.where.get(key, self.head)
        nxt = cur.next
        if nxt is None or nxt is self.tail or nxt.count != cur.count + 1:
            nxt = self._insert_after(cur, cur.count + 1)
        nxt.keys.add(key)
        self.where[key] = nxt
        if cur is not self.head:
            cur.keys.discard(key)
            self._remove_if_empty(cur)

    def dec(self, key: str) -> None:
        cur = self.where.get(key)
        if cur is None:
            return
        cur.keys.discard(key)
        if cur.count == 1:
            del self.where[key]
        else:
            prev = cur.prev
            if prev is None or prev is self.head or prev.count != cur.count - 1:
                assert cur.prev is not None
                prev = self._insert_after(cur.prev, cur.count - 1)
            prev.keys.add(key)
            self.where[key] = prev
        self._remove_if_empty(cur)

    def get_max_key(self) -> str:
        last = self.tail.prev
        if last is None or last is self.head:
            return ""
        return next(iter(last.keys))

    def get_min_key(self) -> str:
        first = self.head.next
        if first is None or first is self.tail:
            return ""
        return next(iter(first.keys))
