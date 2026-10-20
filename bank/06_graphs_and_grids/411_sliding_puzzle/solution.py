from collections import deque


def sliding_puzzle(board: list[list[int]]) -> int:
    # Time: O(6! * 6).
    # Space: O(6!).
    neighbors = [[1, 3], [0, 2, 4], [1, 5], [0, 4], [1, 3, 5], [2, 4]]
    start = "".join(str(v) for row in board for v in row)
    target = "123450"
    seen = {start}
    queue = deque([(start, 0)])
    while queue:
        state, steps = queue.popleft()
        if state == target:
            return steps
        z = state.index("0")
        for nb in neighbors[z]:
            chars = list(state)
            chars[z], chars[nb] = chars[nb], chars[z]
            nxt = "".join(chars)
            if nxt not in seen:
                seen.add(nxt)
                queue.append((nxt, steps + 1))
    return -1
