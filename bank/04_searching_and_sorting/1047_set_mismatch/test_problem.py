from solution import find_error_nums


def test_find_error_nums_middle():
    assert find_error_nums([1, 2, 2, 4]) == [2, 3]


def test_find_error_nums_two_ones():
    assert find_error_nums([1, 1]) == [1, 2]


def test_find_error_nums_missing_one():
    assert find_error_nums([2, 2]) == [2, 1]


def test_find_error_nums_unsorted():
    assert find_error_nums([3, 2, 3, 4, 6, 5]) == [3, 1]


def test_find_error_nums_missing_last():
    assert find_error_nums([1, 5, 3, 2, 2, 7, 6, 4, 8, 9]) == [2, 10]
