from solution import min_swaps


def test_min_swaps_example_one():
    assert min_swaps([0, 1, 0, 1, 1, 0, 0]) == 1


def test_min_swaps_example_two():
    assert min_swaps([0, 1, 1, 1, 0, 0, 1, 1, 0]) == 2


def test_min_swaps_wraps_around():
    assert min_swaps([1, 1, 0, 0, 1]) == 0


def test_min_swaps_no_ones():
    assert min_swaps([0, 0, 0]) == 0


def test_min_swaps_all_ones():
    assert min_swaps([1, 1, 1]) == 0


def test_min_swaps_scattered():
    assert min_swaps([1, 0, 1, 0, 1, 0, 0, 1]) == 1
