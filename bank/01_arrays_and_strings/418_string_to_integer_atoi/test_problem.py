from solution import my_atoi


def test_my_atoi_plain():
    assert my_atoi("42") == 42


def test_my_atoi_whitespace_sign_leading_zero():
    assert my_atoi("   -042") == -42


def test_my_atoi_stops_at_letter():
    assert my_atoi("1337c0d3") == 1337
    assert my_atoi("0-1") == 0


def test_my_atoi_leading_word():
    assert my_atoi("words and 987") == 0


def test_my_atoi_clamps():
    assert my_atoi("-91283472332") == -(2**31)
    assert my_atoi("2147483648") == 2**31 - 1


def test_my_atoi_empty_and_double_sign():
    assert my_atoi("") == 0
    assert my_atoi("   ") == 0
    assert my_atoi("+-12") == 0
    assert my_atoi("+7") == 7
