def hardest_worker(n: int, logs: list[list[int]]) -> int:
    best_len, best_id = -1, n
    prev = 0
    for emp, leave in logs:
        length = leave - prev
        if length > best_len or (length == best_len and emp < best_id):
            best_len, best_id = length, emp
        prev = leave
    return best_id
