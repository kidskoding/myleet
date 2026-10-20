from solution import maximum_rows


def test_maximum_rows_pick_two_of_three():
    assert maximum_rows([[0, 0, 0], [1, 0, 1], [0, 1, 1], [0, 0, 1]], 2) == 3


def test_maximum_rows_single_column():
    assert maximum_rows([[1], [0]], 1) == 2


def test_maximum_rows_all_zero_rows():
    assert maximum_rows([[0, 0], [0, 0], [0, 0]], 1) == 3


def test_maximum_rows_select_every_column():
    assert maximum_rows([[1, 1, 1], [1, 0, 1], [0, 1, 0]], 3) == 3


def test_maximum_rows_conflicting_rows():
    assert maximum_rows([[1, 0, 0], [0, 1, 0], [0, 0, 1], [1, 1, 0]], 1) == 1


def test_maximum_rows_best_pair_covers_combo_row():
    assert maximum_rows([[1, 0, 0], [0, 1, 0], [0, 0, 1], [1, 1, 0]], 2) == 3
