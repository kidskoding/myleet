from solution import calculate


def test_calculate_with_parentheses():
    assert calculate("(1+(4+5+2)-3)+(6+8)") == 23


def test_calculate_simple_addition():
    assert calculate("1 + 1") == 2


def test_calculate_leading_negative():
    assert calculate("-(2+3)") == -5
