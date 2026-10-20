def minimum_buckets(hamsters: str) -> int:
    n = len(hamsters)
    buckets = 0
    i = 0
    while i < n:
        if hamsters[i] == "H":
            if i + 1 < n and hamsters[i + 1] == ".":
                buckets += 1
                i += 3
                continue
            if i > 0 and hamsters[i - 1] == ".":
                buckets += 1
            else:
                return -1
        i += 1
    return buckets
