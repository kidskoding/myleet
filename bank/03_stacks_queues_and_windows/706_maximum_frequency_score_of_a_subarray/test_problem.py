from solution import max_frequency_score


def test_max_frequency_score_example_one():
    assert max_frequency_score([1, 1, 1, 2, 1, 2], 3) == 5


def test_max_frequency_score_all_ones():
    assert max_frequency_score([1, 1, 1, 1, 1, 1], 4) == 1


def test_max_frequency_score_window_is_whole_array():
    assert max_frequency_score([2, 3, 2], 3) == 7


def test_max_frequency_score_window_of_one():
    assert max_frequency_score([4, 9, 2], 1) == 9


def test_max_frequency_score_compares_values_after_modulo():
    assert max_frequency_score([1000000, 1000000, 1000000, 1], 3) == 999993008
