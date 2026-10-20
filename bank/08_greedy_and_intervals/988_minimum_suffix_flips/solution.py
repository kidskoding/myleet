def min_flips(target: str) -> int:
    flips = 0
    prev = "0"
    for ch in target:
        if ch != prev:
            flips += 1
            prev = ch
    return flips
