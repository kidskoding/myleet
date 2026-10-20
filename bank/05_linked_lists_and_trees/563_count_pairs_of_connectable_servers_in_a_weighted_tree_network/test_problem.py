from solution import count_pairs_of_connectable_servers


def test_count_pairs_of_connectable_servers_path():
    edges = [[0, 1, 1], [1, 2, 5], [2, 3, 13], [3, 4, 9], [4, 5, 2]]
    assert count_pairs_of_connectable_servers(edges, 1) == [0, 4, 6, 6, 4, 0]


def test_count_pairs_of_connectable_servers_speed_three():
    edges = [[0, 6, 3], [6, 5, 3], [0, 3, 1], [3, 2, 7], [3, 1, 6], [3, 4, 2]]
    assert count_pairs_of_connectable_servers(edges, 3) == [2, 0, 0, 0, 0, 0, 2]


def test_count_pairs_of_connectable_servers_two_nodes():
    assert count_pairs_of_connectable_servers([[0, 1, 5]], 1) == [0, 0]


def test_count_pairs_of_connectable_servers_star():
    assert count_pairs_of_connectable_servers([[0, 1, 1], [0, 2, 1], [0, 3, 1]], 1) == [3, 0, 0, 0]


def test_count_pairs_of_connectable_servers_star_with_filter():
    assert count_pairs_of_connectable_servers([[0, 1, 2], [0, 2, 1], [0, 3, 2]], 2) == [1, 0, 0, 0]
