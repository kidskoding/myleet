from solution import add_strings


def test_add_strings_normal():
    assert add_strings("11", "123") == "134"


def test_add_strings_with_carry():
    assert add_strings("456", "77") == "533"


def test_add_strings_zeros():
    assert add_strings("0", "0") == "0"
