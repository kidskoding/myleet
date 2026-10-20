def shortest_way(source: str, target: str) -> int:
    count = 0
    i = 0
    while i < len(target):
        start = i
        for ch in source:
            if i < len(target) and ch == target[i]:
                i += 1
        if i == start:
            return -1
        count += 1
    return count
