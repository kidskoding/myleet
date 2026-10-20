def longest_common_prefix(arr1: list[int], arr2: list[int]) -> int:
    prefixes: set[int] = set()
    for x in arr1:
        while x and x not in prefixes:
            prefixes.add(x)
            x //= 10
    best = 0
    for y in arr2:
        while y and y not in prefixes:
            y //= 10
        if y:
            best = max(best, len(str(y)))
    return best
