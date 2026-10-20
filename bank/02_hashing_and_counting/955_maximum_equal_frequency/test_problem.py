from solution import max_equal_freq


def test_max_equal_freq_example_one():
    assert max_equal_freq([2, 2, 1, 1, 5, 3, 3, 5]) == 7


def test_max_equal_freq_example_two():
    assert max_equal_freq([1, 1, 1, 2, 2, 2, 3, 3, 3, 4, 4, 4, 5]) == 13


def test_max_equal_freq_two_same():
    assert max_equal_freq([1, 1]) == 2


def test_max_equal_freq_all_distinct():
    assert max_equal_freq([1, 2, 3, 4]) == 4


def test_max_equal_freq_drop_from_tallest():
    assert max_equal_freq([1, 1, 1, 2, 2, 2]) == 5


def test_max_equal_freq_mixed():
    assert max_equal_freq([10, 2, 8, 9, 3, 8, 1, 5, 2, 3, 7, 6]) == 8
