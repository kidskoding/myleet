from solution import falling_squares


def test_falling_squares_stacking():
    assert falling_squares([[1, 2], [2, 3], [6, 1]]) == [2, 5, 5]


def test_falling_squares_no_overlap():
    assert falling_squares([[100, 100], [200, 100]]) == [100, 100]
