from solution import all_paths_source_target


def test_all_paths_source_target_normal_case():
    result = all_paths_source_target([[1, 2], [3], [3], []])

    assert sorted(result) == sorted([[0, 1, 3], [0, 2, 3]])


def test_all_paths_source_target_single_node():
    assert all_paths_source_target([[]]) == [[0]]
