def relative_sort_array(arr1: list[int], arr2: list[int]) -> list[int]:
    order = {value: i for i, value in enumerate(arr2)}
    return sorted(arr1, key=lambda x: (0, order[x]) if x in order else (1, x))
