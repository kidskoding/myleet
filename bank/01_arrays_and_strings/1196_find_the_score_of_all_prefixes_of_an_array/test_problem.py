from solution import find_prefix_score


def test_find_prefix_score_example_one():
    assert find_prefix_score([2, 3, 7, 5, 10]) == [4, 10, 24, 36, 56]


def test_find_prefix_score_example_two():
    assert find_prefix_score([1, 1, 2, 4, 8, 16]) == [2, 4, 8, 16, 32, 64]


def test_find_prefix_score_single():
    assert find_prefix_score([5]) == [10]
