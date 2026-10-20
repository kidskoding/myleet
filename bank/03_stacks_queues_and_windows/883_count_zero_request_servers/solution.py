def count_servers(n: int, logs: list[list[int]], x: int, queries: list[int]) -> list[int]:
    logs = sorted(logs, key=lambda log: log[1])
    order = sorted(range(len(queries)), key=lambda i: queries[i])
    counts = [0] * (n + 1)
    active = 0
    lo = hi = 0
    answer = [0] * len(queries)
    for qi in order:
        end = queries[qi]
        while hi < len(logs) and logs[hi][1] <= end:
            server = logs[hi][0]
            if counts[server] == 0:
                active += 1
            counts[server] += 1
            hi += 1
        while lo < hi and logs[lo][1] < end - x:
            server = logs[lo][0]
            counts[server] -= 1
            if counts[server] == 0:
                active -= 1
            lo += 1
        answer[qi] = n - active
    return answer
