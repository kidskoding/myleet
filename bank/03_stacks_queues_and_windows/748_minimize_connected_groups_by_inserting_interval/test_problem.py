from solution import min_connected_groups


def test_min_connected_groups_bridge_one_gap():
    assert min_connected_groups([[1, 3], [5, 6], [8, 10]], 3) == 2


def test_min_connected_groups_no_gap_bridgeable():
    assert min_connected_groups([[5, 10], [1, 1], [3, 3]], 1) == 3


def test_min_connected_groups_single_interval():
    assert min_connected_groups([[1, 5]], 2) == 1


def test_min_connected_groups_bridge_everything():
    assert min_connected_groups([[1, 2], [4, 5], [7, 8]], 5) == 1


def test_min_connected_groups_overlapping_input():
    assert min_connected_groups([[1, 4], [2, 3], [6, 7]], 1) == 2


def test_min_connected_groups_exact_length_bridge():
    assert min_connected_groups([[1, 2], [4, 5], [9, 9]], 2) == 2
