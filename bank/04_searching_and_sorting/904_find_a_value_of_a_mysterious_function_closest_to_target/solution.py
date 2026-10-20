def closest_to_target(arr: list[int], target: int) -> int:
    best = abs(arr[0] - target)
    ending_here: set[int] = set()
    for x in arr:
        ending_here = {x} | {value & x for value in ending_here}
        for value in ending_here:
            best = min(best, abs(value - target))
    return best
