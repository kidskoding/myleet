def can_make_pali_queries(s: str, queries: list[list[int]]) -> list[bool]:
    prefix = [0]
    for ch in s:
        prefix.append(prefix[-1] ^ (1 << (ord(ch) - ord("a"))))
    return [(prefix[right + 1] ^ prefix[left]).bit_count() // 2 <= k for left, right, k in queries]
