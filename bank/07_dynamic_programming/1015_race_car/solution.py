from collections import deque


def racecar(target: int) -> int:
    queue: deque[tuple[int, int, int]] = deque([(0, 1, 0)])
    seen = {(0, 1)}
    limit = 2 * target + 1
    while queue:
        pos, speed, steps = queue.popleft()
        if pos == target:
            return steps
        nxt = (pos + speed, speed * 2)
        if abs(nxt[0]) <= limit and nxt not in seen:
            seen.add(nxt)
            queue.append((nxt[0], nxt[1], steps + 1))
        rev = (pos, -1 if speed > 0 else 1)
        if rev not in seen:
            seen.add(rev)
            queue.append((rev[0], rev[1], steps + 1))
    return -1
