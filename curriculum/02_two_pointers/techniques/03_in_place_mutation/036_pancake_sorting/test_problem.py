from solution import pancake_sort


def _apply_flips(arr: list[int], flips: list[int]) -> list[int]:
    out = arr[:]
    for k in flips:
        out[:k] = out[:k][::-1]
    return out


def test_pancake_sort_normal():
    arr = [3, 2, 4, 1]
    assert _apply_flips(arr, pancake_sort(arr)) == [1, 2, 3, 4]


def test_pancake_sort_already_sorted():
    arr = [1, 2, 3]
    assert _apply_flips(arr, pancake_sort(arr)) == [1, 2, 3]


def test_pancake_sort_two_swapped():
    arr = [2, 1, 3]
    assert _apply_flips(arr, pancake_sort(arr)) == [1, 2, 3]
