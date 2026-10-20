from solution import min_taps


def test_min_taps_one_tap_covers_all():
    assert min_taps(5, [3, 4, 1, 1, 0, 0]) == 1


def test_min_taps_impossible():
    assert min_taps(3, [0, 0, 0, 0]) == -1


def test_min_taps_chain_of_taps():
    assert min_taps(7, [1, 2, 1, 0, 2, 1, 0, 1]) == 3


def test_min_taps_smallest_garden():
    assert min_taps(1, [1, 0]) == 1


def test_min_taps_gap_in_middle():
    assert min_taps(4, [1, 0, 0, 0, 1]) == -1


def test_min_taps_overlapping_choices():
    assert min_taps(8, [4, 0, 0, 0, 0, 0, 0, 0, 4]) == 2
