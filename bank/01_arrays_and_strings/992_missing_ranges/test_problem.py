from solution import find_missing_ranges


def test_find_missing_ranges_example():
    assert find_missing_ranges([0, 1, 3, 50, 75], 0, 99) == [[2, 2], [4, 49], [51, 74], [76, 99]]


def test_find_missing_ranges_nothing_missing():
    assert find_missing_ranges([-1], -1, -1) == []


def test_find_missing_ranges_empty_nums_single():
    assert find_missing_ranges([], 1, 1) == [[1, 1]]


def test_find_missing_ranges_empty_nums_wide():
    assert find_missing_ranges([], -3, 3) == [[-3, 3]]


def test_find_missing_ranges_bounds_present():
    assert find_missing_ranges([0, 9], 0, 9) == [[1, 8]]


def test_find_missing_ranges_full_coverage():
    assert find_missing_ranges([1, 2, 3], 1, 3) == []
