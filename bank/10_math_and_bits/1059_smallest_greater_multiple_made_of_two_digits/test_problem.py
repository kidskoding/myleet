from solution import find_integer


def test_find_integer_uses_zero():
    assert find_integer(2, 0, 2) == 20


def test_find_integer_two_nonzero_digits():
    assert find_integer(3, 4, 2) == 24


def test_find_integer_only_zero():
    assert find_integer(2, 0, 0) == -1


def test_find_integer_never_divisible():
    assert find_integer(5, 1, 1) == -1


def test_find_integer_k_one():
    assert find_integer(1, 1, 0) == 10


def test_find_integer_three_digit_answer():
    assert find_integer(7, 3, 1) == 133
