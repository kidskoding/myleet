from solution import has_valid_path


def test_has_valid_path_winding_route():
    assert has_valid_path([[2, 4, 3], [6, 5, 2]]) is True


def test_has_valid_path_streets_do_not_connect():
    assert has_valid_path([[1, 2, 1], [1, 2, 1]]) is False


def test_has_valid_path_dead_end():
    assert has_valid_path([[1, 1, 2]]) is False


def test_has_valid_path_long_row_ending_in_turn():
    assert has_valid_path([[1, 1, 1, 1, 1, 1, 3]]) is True


def test_has_valid_path_column_ending_in_turn():
    assert has_valid_path([[2], [2], [2], [2], [2], [2], [6]]) is True


def test_has_valid_path_single_cell():
    assert has_valid_path([[4]]) is True


def test_has_valid_path_start_points_away():
    assert has_valid_path([[2, 1]]) is False
