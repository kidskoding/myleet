from solution import min_bit_flips


def test_min_bit_flips_example():
    assert min_bit_flips(10, 7) == 3


def test_min_bit_flips_small():
    assert min_bit_flips(3, 4) == 3


def test_min_bit_flips_zero():
    assert min_bit_flips(0, 0) == 0


def test_min_bit_flips_equal():
    assert min_bit_flips(5, 5) == 0


def test_min_bit_flips_all_bits():
    assert min_bit_flips(0, 2**30 - 1) == 30
