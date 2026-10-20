from bisect import bisect_left


def maximum_beauty(flowers: list[int], new_flowers: int, target: int, full: int, partial: int) -> int:
    gardens = sorted(min(f, target) for f in flowers)
    n = len(gardens)
    incomplete = bisect_left(gardens, target)
    prefix = [0]
    for f in gardens:
        prefix.append(prefix[-1] + f)

    best = 0
    cost = 0
    j = incomplete
    for i in range(incomplete, -1, -1):
        if i < incomplete:
            cost += target - gardens[i]
        if cost > new_flowers:
            break
        left = new_flowers - cost
        complete = n - i
        if i == 0:
            best = max(best, complete * full)
            continue
        j = min(j, i)
        while gardens[j - 1] * j - prefix[j] > left:
            j -= 1
        level = min((prefix[j] + left) // j, target - 1)
        best = max(best, complete * full + level * partial)
    return best
