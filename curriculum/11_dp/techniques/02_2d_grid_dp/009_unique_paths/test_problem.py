from solution import unique_paths


def test_unique_paths_single_cell():
    assert unique_paths(1, 1) == 1


def test_unique_paths_single_row():
    assert unique_paths(1, 5) == 1


def test_unique_paths_normal():
    assert unique_paths(3, 7) == 28
