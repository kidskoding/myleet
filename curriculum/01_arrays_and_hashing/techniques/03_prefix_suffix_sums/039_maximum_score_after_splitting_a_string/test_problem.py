from solution import max_score


def test_max_score_normal():
    assert max_score("011101") == 5


def test_max_score_zeros_then_ones():
    assert max_score("00111") == 5


def test_max_score_all_ones():
    assert max_score("1111") == 3
