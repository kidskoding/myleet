from solution import valid_square


def test_valid_square_true():
    assert valid_square([0, 0], [1, 1], [1, 0], [0, 1]) is True


def test_valid_square_false_not_square():
    assert valid_square([0, 0], [1, 1], [1, 0], [0, 12]) is False


def test_valid_square_duplicate_points():
    assert valid_square([0, 0], [0, 0], [1, 0], [0, 1]) is False
