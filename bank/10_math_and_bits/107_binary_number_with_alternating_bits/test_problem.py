from solution import has_alternating_bits


def test_has_alternating_bits_five():
    assert has_alternating_bits(5) is True


def test_has_alternating_bits_seven():
    assert has_alternating_bits(7) is False


def test_has_alternating_bits_eleven():
    assert has_alternating_bits(11) is False


def test_has_alternating_bits_ten_and_one():
    assert has_alternating_bits(10) is True
    assert has_alternating_bits(1) is True


def test_has_alternating_bits_trailing_zeros():
    assert has_alternating_bits(4) is False
    assert has_alternating_bits(0b1010101010101) is True
