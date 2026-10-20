from solution import bitwise_complement


def test_bitwise_complement_normal():
    assert bitwise_complement(5) == 2


def test_bitwise_complement_all_ones():
    assert bitwise_complement(7) == 0


def test_bitwise_complement_zero():
    assert bitwise_complement(0) == 1


def test_bitwise_complement_even():
    assert bitwise_complement(10) == 5
