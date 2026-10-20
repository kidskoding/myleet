from solution import min_flips_mono_incr


def test_min_flips_mono_incr_example_one():
    assert min_flips_mono_incr("00110") == 1


def test_min_flips_mono_incr_example_two():
    assert min_flips_mono_incr("010110") == 2


def test_min_flips_mono_incr_example_three():
    assert min_flips_mono_incr("00011000") == 2


def test_min_flips_mono_incr_single_character():
    assert min_flips_mono_incr("0") == 0
    assert min_flips_mono_incr("1") == 0


def test_min_flips_mono_incr_already_sorted():
    assert min_flips_mono_incr("000111") == 0


def test_min_flips_mono_incr_reversed():
    assert min_flips_mono_incr("111000") == 3
