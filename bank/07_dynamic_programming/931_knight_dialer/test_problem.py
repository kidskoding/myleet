from solution import knight_dialer


def test_knight_dialer_length_one():
    assert knight_dialer(1) == 10


def test_knight_dialer_length_two():
    assert knight_dialer(2) == 20


def test_knight_dialer_length_three():
    assert knight_dialer(3) == 46


def test_knight_dialer_length_four():
    assert knight_dialer(4) == 104


def test_knight_dialer_needs_modulo():
    assert knight_dialer(3131) == 136006598
