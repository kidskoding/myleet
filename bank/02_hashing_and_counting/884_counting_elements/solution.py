def count_elements(arr: list[int]) -> int:
    present = set(arr)
    return sum(1 for x in arr if x + 1 in present)
