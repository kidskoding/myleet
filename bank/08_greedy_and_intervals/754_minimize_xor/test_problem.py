from solution import minimize_xor


def test_minimize_xor_same_value_possible():
    assert minimize_xor(3, 5) == 3


def test_minimize_xor_needs_extra_bit():
    assert minimize_xor(1, 12) == 3


def test_minimize_xor_equal_popcount():
    assert minimize_xor(5, 6) == 5


def test_minimize_xor_fill_low_bits():
    assert minimize_xor(1, 7) == 7


def test_minimize_xor_keep_only_top_bit():
    assert minimize_xor(15, 1) == 8
