from solution import min_swaps_couples


def test_min_swaps_couples_one_swap():
    assert min_swaps_couples([0, 2, 1, 3]) == 1


def test_min_swaps_couples_already_seated():
    assert min_swaps_couples([3, 2, 0, 1]) == 0


def test_min_swaps_couples_single_couple_reversed():
    assert min_swaps_couples([1, 0]) == 0


def test_min_swaps_couples_three_cycle():
    assert min_swaps_couples([0, 2, 4, 1, 3, 5]) == 2


def test_min_swaps_couples_mixed_seated_and_cycle():
    assert min_swaps_couples([5, 4, 2, 6, 3, 1, 0, 7]) == 2
