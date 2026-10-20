from solution import check_perfect_number


def test_check_perfect_number_twenty_eight():
    assert check_perfect_number(28) is True


def test_check_perfect_number_prime():
    assert check_perfect_number(7) is False


def test_check_perfect_number_one():
    assert check_perfect_number(1) is False


def test_check_perfect_number_six():
    assert check_perfect_number(6) is True


def test_check_perfect_number_perfect_square_input():
    assert check_perfect_number(16) is False


def test_check_perfect_number_large():
    assert check_perfect_number(33550336) is True
    assert check_perfect_number(33550337) is False
