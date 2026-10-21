from solution import is_perfect_square


def test_is_perfect_square_sixteen():
    assert is_perfect_square(16) is True


def test_is_perfect_square_fourteen():
    assert is_perfect_square(14) is False


def test_is_perfect_square_one():
    assert is_perfect_square(1) is True


def test_is_perfect_square_large():
    assert is_perfect_square(808201) is True


def test_is_perfect_square_two():
    assert is_perfect_square(2) is False
