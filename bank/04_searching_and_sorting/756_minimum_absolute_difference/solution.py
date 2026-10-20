def minimum_abs_difference(arr: list[int]) -> list[list[int]]:
    arr = sorted(arr)
    gap = min(b - a for a, b in zip(arr, arr[1:]))
    return [[a, b] for a, b in zip(arr, arr[1:]) if b - a == gap]
