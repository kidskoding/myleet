from solution import is_number


def test_is_number_integers_and_decimals():
    for s in ["2", "0089", "-0.1", "+3.14", "4.", "-.9"]:
        assert is_number(s) is True, s


def test_is_number_exponents():
    for s in ["2e10", "-90E3", "3e+7", "+6e-1", "53.5e93", "-123.456e789"]:
        assert is_number(s) is True, s


def test_is_number_letters_rejected():
    for s in ["abc", "1a", "95a54e53"]:
        assert is_number(s) is False, s


def test_is_number_bad_exponent():
    for s in ["1e", "e3", "99e2.5", ".e1", "e"]:
        assert is_number(s) is False, s


def test_is_number_bad_signs():
    for s in ["--6", "-+3", "+", "6+1", "1e+-2"]:
        assert is_number(s) is False, s


def test_is_number_lone_dot_and_empty():
    assert is_number(".") is False
    assert is_number("") is False
    assert is_number(".5") is True
