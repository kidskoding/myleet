from solution import pick_gifts


def test_pick_gifts_example():
    assert pick_gifts([25, 64, 9, 4, 100], 4) == 29


def test_pick_gifts_all_ones_stay():
    assert pick_gifts([1, 1, 1, 1], 4) == 4


def test_pick_gifts_single_pile_repeated():
    assert pick_gifts([100], 3) == 1


def test_pick_gifts_k_beyond_reduction():
    assert pick_gifts([1], 5) == 1


def test_pick_gifts_large_pile():
    assert pick_gifts([10**9, 5], 1) == 31627
