from solution import min_flips


def test_min_flips_example_one():
    assert min_flips("10111") == 3


def test_min_flips_alternating():
    assert min_flips("101") == 3


def test_min_flips_all_zeros():
    assert min_flips("00000") == 0


def test_min_flips_single_one():
    assert min_flips("1") == 1


def test_min_flips_leading_zero():
    assert min_flips("0101") == 3
