def xor_queries(arr: list[int], queries: list[list[int]]) -> list[int]:
    # Time: O(n + q).
    # Space: O(n).
    prefix = [0]
    for v in arr:
        prefix.append(prefix[-1] ^ v)
    return [prefix[r + 1] ^ prefix[left] for left, r in queries]
