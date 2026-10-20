def subarray_bitwise_ors(arr: list[int]) -> int:
    seen: set[int] = set()
    ending_here: set[int] = set()
    for x in arr:
        ending_here = {x} | {value | x for value in ending_here}
        seen |= ending_here
    return len(seen)
