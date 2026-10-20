from solution import count_paths


def test_count_paths_example_square():
    assert count_paths([[1, 1], [3, 4]]) == 8


def test_count_paths_example_column():
    assert count_paths([[1], [2]]) == 3


def test_count_paths_single_cell():
    assert count_paths([[5]]) == 1


def test_count_paths_all_equal():
    assert count_paths([[2, 2], [2, 2]]) == 4


def test_count_paths_increasing_row():
    assert count_paths([[1, 2, 3]]) == 6


def test_count_paths_cycle_of_values():
    assert count_paths([[1, 2], [4, 3]]) == 11
