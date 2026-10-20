from solution import max_non_decreasing_length


def test_max_non_decreasing_length_short_run():
    assert max_non_decreasing_length([2, 3, 1], [1, 2, 1]) == 2


def test_max_non_decreasing_length_mix_both_arrays():
    assert max_non_decreasing_length([1, 3, 2, 1], [2, 2, 3, 4]) == 4


def test_max_non_decreasing_length_equal_values():
    assert max_non_decreasing_length([1, 1], [2, 2]) == 2


def test_max_non_decreasing_length_single_element():
    assert max_non_decreasing_length([5], [3]) == 1


def test_max_non_decreasing_length_must_switch_back_and_forth():
    assert max_non_decreasing_length([1, 9, 3, 9], [9, 2, 9, 4]) == 4


def test_max_non_decreasing_length_both_decreasing_but_overlapping():
    assert max_non_decreasing_length([5, 4, 3], [6, 5, 4]) == 2
