from solution import max_score


def test_max_score_takes_from_both_ends():
    assert max_score([1, 2, 3, 4, 5, 6, 1], 3) == 12


def test_max_score_takes_all():
    assert max_score([2, 2, 2], 2) == 4


def test_max_score_whole_array():
    assert max_score([9, 7, 7, 9, 7, 7, 9], 7) == 55
