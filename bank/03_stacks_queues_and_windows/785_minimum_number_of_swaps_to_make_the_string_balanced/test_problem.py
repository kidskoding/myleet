from solution import min_swaps


def test_min_swaps_one_swap():
    assert min_swaps("][][") == 1


def test_min_swaps_three_unmatched():
    assert min_swaps("]]][[[") == 2


def test_min_swaps_balanced():
    assert min_swaps("[]") == 0


def test_min_swaps_four_unmatched():
    assert min_swaps("]]]][[[[") == 2


def test_min_swaps_nested_balanced():
    assert min_swaps("[[]][]") == 0
