from solution import min_flips


def test_min_flips_rotation_helps():
    assert min_flips("111000") == 2


def test_min_flips_already_alternating():
    assert min_flips("010") == 0


def test_min_flips_one_flip():
    assert min_flips("1110") == 1


def test_min_flips_single_char():
    assert min_flips("1") == 0


def test_min_flips_odd_length_rotation_only():
    assert min_flips("01001001101") == 2


def test_min_flips_all_same_even():
    assert min_flips("0000") == 2
