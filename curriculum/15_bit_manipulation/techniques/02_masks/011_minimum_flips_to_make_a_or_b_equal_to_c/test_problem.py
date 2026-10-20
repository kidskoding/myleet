from solution import min_flips


def test_min_flips_zero_flips_needed():
    assert min_flips(2, 6, 5) == 3


def test_min_flips_already_equal():
    assert min_flips(4, 2, 7) == 1


def test_min_flips_all_zero():
    assert min_flips(1, 2, 3) == 0
