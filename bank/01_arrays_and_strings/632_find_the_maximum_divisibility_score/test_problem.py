from solution import max_div_score


def test_max_div_score_tie_takes_smallest():
    assert max_div_score([2, 9, 15, 50], [5, 3, 7, 2]) == 2


def test_max_div_score_clear_winner():
    assert max_div_score([4, 7, 9, 3, 9], [5, 2, 3]) == 3


def test_max_div_score_divisor_order_irrelevant():
    assert max_div_score([20, 14, 21, 10], [10, 16, 20]) == 10


def test_max_div_score_all_zero_scores():
    assert max_div_score([1, 1], [9, 4, 7]) == 4


def test_max_div_score_single_divisor():
    assert max_div_score([5], [3]) == 3
