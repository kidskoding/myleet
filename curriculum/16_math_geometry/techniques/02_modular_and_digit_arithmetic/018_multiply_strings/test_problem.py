from solution import multiply


def test_multiply_single_digits():
    assert multiply("2", "3") == "6"


def test_multiply_multi_digit():
    assert multiply("123", "456") == "56088"


def test_multiply_by_zero():
    assert multiply("0", "52") == "0"
