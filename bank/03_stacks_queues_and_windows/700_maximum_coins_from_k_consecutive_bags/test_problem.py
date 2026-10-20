from solution import maximum_coins


def test_maximum_coins_spans_gap():
    assert maximum_coins([[8, 10, 1], [1, 3, 2], [5, 6, 4]], 4) == 10


def test_maximum_coins_inside_one_segment():
    assert maximum_coins([[1, 10, 3]], 2) == 6


def test_maximum_coins_window_longer_than_everything():
    assert maximum_coins([[1, 2, 5], [10, 10, 1]], 100) == 11


def test_maximum_coins_single_bag():
    assert maximum_coins([[3, 5, 2], [7, 7, 9]], 1) == 9


def test_maximum_coins_best_window_ends_at_segment_end():
    assert maximum_coins([[1, 4, 1], [5, 6, 10]], 3) == 21
