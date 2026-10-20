def max_count(banned: list[int], n: int, max_sum: int) -> int:
    blocked = set(banned)
    total = count = 0
    for x in range(1, n + 1):
        if x in blocked:
            continue
        if total + x > max_sum:
            break
        total += x
        count += 1
    return count
