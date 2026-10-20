from solution import rotated_digits


def test_rotated_digits_ten():
    assert rotated_digits(10) == 4


def test_rotated_digits_one():
    assert rotated_digits(1) == 0


def test_rotated_digits_two():
    assert rotated_digits(2) == 1


def test_rotated_digits_twenty():
    assert rotated_digits(20) == 9


def test_rotated_digits_hundred():
    assert rotated_digits(100) == 40
