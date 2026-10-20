from solution import min_wasted_space


def test_min_wasted_space_first_supplier():
    assert min_wasted_space([2, 3, 5], [[4, 8], [2, 8]]) == 6


def test_min_wasted_space_impossible():
    assert min_wasted_space([2, 3, 5], [[1, 4], [2, 3], [3, 4]]) == -1


def test_min_wasted_space_third_supplier():
    assert min_wasted_space([3, 5, 8, 10, 11, 12], [[12], [11, 9], [10, 5, 14]]) == 9


def test_min_wasted_space_perfect_fit():
    assert min_wasted_space([4, 4, 7], [[9], [7, 4]]) == 0


def test_min_wasted_space_single_package():
    assert min_wasted_space([1], [[100], [2]]) == 1
