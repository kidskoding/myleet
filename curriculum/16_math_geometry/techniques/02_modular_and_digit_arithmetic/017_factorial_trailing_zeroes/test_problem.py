from solution import trailing_zeroes


def test_trailing_zeroes_none():
    assert trailing_zeroes(3) == 0


def test_trailing_zeroes_one():
    assert trailing_zeroes(5) == 1


def test_trailing_zeroes_many():
    assert trailing_zeroes(30) == 7
