from solution import min_swaps


def test_min_swaps_three_ones():
    assert min_swaps([1, 0, 1, 0, 1]) == 1


def test_min_swaps_single_one():
    assert min_swaps([0, 0, 0, 1, 0]) == 0


def test_min_swaps_longer_array():
    assert min_swaps([1, 0, 1, 0, 1, 0, 0, 1, 1, 0, 1]) == 3


def test_min_swaps_no_ones():
    assert min_swaps([0, 0, 0]) == 0


def test_min_swaps_all_ones():
    assert min_swaps([1, 1, 1]) == 0


def test_min_swaps_ones_at_both_ends():
    assert min_swaps([1, 0, 0, 0, 1]) == 1
