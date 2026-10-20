from solution import find_median_sorted_arrays


def test_find_median_sorted_arrays_odd_total():
    assert find_median_sorted_arrays([1, 3], [2]) == 2.0


def test_find_median_sorted_arrays_even_total():
    assert find_median_sorted_arrays([1, 2], [3, 4]) == 2.5


def test_find_median_sorted_arrays_one_empty():
    assert find_median_sorted_arrays([], [1]) == 1.0


def test_find_median_sorted_arrays_both_single():
    assert find_median_sorted_arrays([2], [3]) == 2.5
