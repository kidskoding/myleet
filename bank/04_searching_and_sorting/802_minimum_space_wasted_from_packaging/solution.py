from bisect import bisect_right

MOD = 10**9 + 7


def min_wasted_space(packages: list[int], boxes: list[list[int]]) -> int:
    packages = sorted(packages)
    largest = packages[-1]
    best = None
    for supplier in boxes:
        supplier = sorted(supplier)
        if supplier[-1] < largest:
            continue
        space = 0
        placed = 0
        for box in supplier:
            upto = bisect_right(packages, box)
            space += (upto - placed) * box
            placed = upto
            if placed == len(packages):
                break
        if best is None or space < best:
            best = space
    return -1 if best is None else (best - sum(packages)) % MOD
