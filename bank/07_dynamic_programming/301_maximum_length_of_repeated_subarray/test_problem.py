from solution import find_length


def test_find_length_example():
    assert find_length([1, 2, 3, 2, 1], [3, 2, 1, 4, 7]) == 3


def test_find_length_all_equal():
    assert find_length([0, 0, 0, 0, 0], [0, 0, 0, 0, 0]) == 5


def test_find_length_nothing_shared():
    assert find_length([1, 2], [3, 4]) == 0


def test_find_length_single_elements():
    assert find_length([5], [5]) == 1


def test_find_length_subsequence_is_not_subarray():
    assert find_length([0, 1, 1, 1, 1], [1, 0, 1, 0, 1]) == 2


def test_find_length_different_lengths():
    assert find_length([7, 8, 9, 1, 2, 3, 4], [1, 2, 3, 4]) == 4
