from solution import add_binary


def test_add_binary_carry_into_new_digit():
    assert add_binary("11", "1") == "100"


def test_add_binary_equal_lengths():
    assert add_binary("1010", "1011") == "10101"


def test_add_binary_zeros():
    assert add_binary("0", "0") == "0"


def test_add_binary_long_carry_chain():
    assert add_binary("1111", "1") == "10000"


def test_add_binary_different_lengths_no_carry():
    assert add_binary("100000", "11") == "100011"
