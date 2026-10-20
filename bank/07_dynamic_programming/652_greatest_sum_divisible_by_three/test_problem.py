from solution import max_sum_div_three


def test_max_sum_div_three_example_one():
    assert max_sum_div_three([3, 6, 5, 1, 8]) == 18


def test_max_sum_div_three_nothing_works():
    assert max_sum_div_three([4]) == 0


def test_max_sum_div_three_example_three():
    assert max_sum_div_three([1, 2, 3, 4, 4]) == 12


def test_max_sum_div_three_single_multiple():
    assert max_sum_div_three([3]) == 3


def test_max_sum_div_three_drop_two_small():
    assert max_sum_div_three([2, 2, 2, 2]) == 6


def test_max_sum_div_three_two_ones():
    assert max_sum_div_three([1, 1]) == 0
