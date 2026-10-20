from solution import count_squares


def test_count_squares_normal():
    assert count_squares([[0, 1, 1, 1], [1, 1, 1, 1], [0, 1, 1, 1]]) == 15


def test_count_squares_no_large_square():
    assert count_squares([[1, 0, 1], [1, 1, 0], [1, 1, 0]]) == 7
