from solution import valid_path


def test_valid_path_direct_edge():
    assert valid_path(3, [[0, 1], [1, 2], [2, 0]], 0, 2) is True


def test_valid_path_no_path_disconnected():
    assert valid_path(6, [[0, 1], [0, 2], [3, 5], [5, 4], [4, 3]], 0, 5) is False


def test_valid_path_single_node_source_equals_destination():
    assert valid_path(1, [], 0, 0) is True
