from solution import divisor_game


def test_divisor_game_two():
    assert divisor_game(2) is True


def test_divisor_game_three():
    assert divisor_game(3) is False


def test_divisor_game_one():
    assert divisor_game(1) is False


def test_divisor_game_four():
    assert divisor_game(4) is True


def test_divisor_game_upper_limit():
    assert divisor_game(1000) is True
    assert divisor_game(999) is False
