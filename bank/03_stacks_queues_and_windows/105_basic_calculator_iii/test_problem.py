from solution import calculate


def test_calculate_simple_addition():
    assert calculate("1+1") == 2


def test_calculate_precedence():
    assert calculate("6-4/2") == 4


def test_calculate_parentheses():
    assert calculate("2*(5+5*2)/3+(6/2+8)") == 21


def test_calculate_nested_parentheses_negative_result():
    assert calculate("(2+6*3+5-(3*14/7+2)*5)+3") == -12


def test_calculate_division_truncates_toward_zero():
    assert calculate("7/2") == 3
    assert calculate("(1-8)/2") == -3


def test_calculate_single_number():
    assert calculate("0") == 0
    assert calculate("42") == 42
