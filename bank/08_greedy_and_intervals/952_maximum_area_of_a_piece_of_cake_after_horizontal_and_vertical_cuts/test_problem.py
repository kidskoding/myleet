from solution import max_area


def test_max_area_example_one():
    assert max_area(5, 4, [1, 2, 4], [1, 3]) == 4


def test_max_area_unsorted_cuts():
    assert max_area(5, 4, [3, 1], [1]) == 6


def test_max_area_single_cut_each():
    assert max_area(5, 4, [3], [3]) == 9


def test_max_area_edge_gap_wins():
    assert max_area(10, 10, [1, 2], [9]) == 72


def test_max_area_modulo():
    assert max_area(10**9, 10**9, [1], [1]) == 64
