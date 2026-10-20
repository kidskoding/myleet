def longest_repeating(s: str, query_characters: str, query_indices: list[int]) -> list[int]:
    chars = list(s)
    n = len(chars)
    size = 1
    while size < n:
        size *= 2
    pre = [0] * (2 * size)
    suf = [0] * (2 * size)
    best = [0] * (2 * size)
    lo = [0] * (2 * size)
    hi = [0] * (2 * size)
    length = [0] * (2 * size)

    def pull(node: int) -> None:
        left, right = 2 * node, 2 * node + 1
        if length[right] == 0:
            pre[node], suf[node], best[node] = pre[left], suf[left], best[left]
            lo[node], hi[node], length[node] = lo[left], hi[left], length[left]
            return
        length[node] = length[left] + length[right]
        lo[node], hi[node] = lo[left], hi[right]
        joins = chars[hi[left]] == chars[lo[right]]
        pre[node] = pre[left] + pre[right] if joins and pre[left] == length[left] else pre[left]
        suf[node] = suf[right] + suf[left] if joins and suf[right] == length[right] else suf[right]
        best[node] = max(best[left], best[right])
        if joins:
            best[node] = max(best[node], suf[left] + pre[right])

    for i in range(n):
        node = size + i
        pre[node] = suf[node] = best[node] = length[node] = 1
        lo[node] = hi[node] = i
    for node in range(size - 1, 0, -1):
        pull(node)

    answer = []
    for ch, idx in zip(query_characters, query_indices):
        chars[idx] = ch
        node = (size + idx) // 2
        while node:
            pull(node)
            node //= 2
        answer.append(best[1])
    return answer
