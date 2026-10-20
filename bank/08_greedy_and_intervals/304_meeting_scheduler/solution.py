def min_available_duration(slots1: list[list[int]], slots2: list[list[int]], duration: int) -> list[int]:
    a = sorted(slots1)
    b = sorted(slots2)
    i = j = 0
    while i < len(a) and j < len(b):
        start = max(a[i][0], b[j][0])
        end = min(a[i][1], b[j][1])
        if end - start >= duration:
            return [start, start + duration]
        if a[i][1] < b[j][1]:
            i += 1
        else:
            j += 1
    return []
