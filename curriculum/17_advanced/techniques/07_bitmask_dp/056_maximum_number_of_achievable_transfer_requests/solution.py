def maximum_requests(n: int, requests: list[list[int]]) -> int:
    # Problem 56: Maximum Number of Achievable Transfer Requests
    # Time: O(2^m * (m + n))
    # Space: O(n)

    m = len(requests)
    best = 0
    for mask in range(1 << m):
        balance = [0] * n
        count = 0
        for i in range(m):
            if mask & (1 << i):
                frm, to = requests[i]
                balance[frm] -= 1
                balance[to] += 1
                count += 1
        if all(b == 0 for b in balance):
            best = max(best, count)
    return best
