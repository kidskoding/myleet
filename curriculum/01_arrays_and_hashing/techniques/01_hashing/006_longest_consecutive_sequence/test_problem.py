from solution import longest_consecutive


def test_longest_consecutive_normal():
    assert longest_consecutive([100, 4, 200, 1, 3, 2]) == 4


def test_longest_consecutive_empty():
    assert longest_consecutive([]) == 0


def test_longest_consecutive_with_duplicates():
    assert longest_consecutive([1, 2, 0, 1]) == 3


def test_longest_consecutive_single_element():
    assert longest_consecutive([7]) == 1


def test_longest_consecutive_with_negatives():
    assert longest_consecutive([-3, -2, -1, 5, 7]) == 3


def test_longest_consecutive_no_run_longer_than_one():
    assert longest_consecutive([10, 30, 20]) == 1
