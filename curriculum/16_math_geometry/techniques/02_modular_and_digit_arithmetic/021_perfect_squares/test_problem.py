from solution import num_squares


def test_num_squares_three_terms():
    assert num_squares(12) == 3


def test_num_squares_two_terms():
    assert num_squares(13) == 2


def test_num_squares_perfect_square():
    assert num_squares(1) == 1
