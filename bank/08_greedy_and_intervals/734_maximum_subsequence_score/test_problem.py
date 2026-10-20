from solution import max_score


def test_max_score_example_three_of_four():
    assert max_score([1, 3, 3, 2], [2, 1, 3, 4], 3) == 12


def test_max_score_single_pick():
    assert max_score([4, 2, 3, 1, 1], [7, 5, 10, 9, 6], 1) == 30


def test_max_score_take_everything():
    assert max_score([2, 3], [4, 1], 2) == 5


def test_max_score_zero_sums():
    assert max_score([0, 0], [5, 5], 1) == 0


def test_max_score_skip_low_minimum():
    assert max_score([3, 1, 2], [1, 5, 4], 2) == 12
