from solution import max_score


def test_max_score_odd_length():
    assert max_score([2, 4, 1]) == 6


def test_max_score_even_length():
    assert max_score([5, -1, 4, 2]) == 7


def test_max_score_two_elements():
    assert max_score([3, 8]) == 0


def test_max_score_single_element():
    assert max_score([-4]) == 0


def test_max_score_leftover_in_middle():
    assert max_score([5, 5, -9, 5, 5]) == 20


def test_max_score_all_negative_even():
    assert max_score([-1, -2, -3, -4, -5, -6]) == -10
