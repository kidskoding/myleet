from solution import count_pairs


def test_count_pairs_fully_connected():
    assert count_pairs(3, [[0, 1], [0, 2], [1, 2]]) == 0


def test_count_pairs_three_components():
    assert count_pairs(7, [[0, 2], [0, 5], [2, 4], [1, 6], [5, 4]]) == 14


def test_count_pairs_single_node():
    assert count_pairs(1, []) == 0


def test_count_pairs_no_edges():
    assert count_pairs(4, []) == 6


def test_count_pairs_two_chains():
    assert count_pairs(5, [[0, 1], [1, 2], [3, 4]]) == 6


def test_count_pairs_large_isolated_nodes():
    assert count_pairs(10**5, []) == 10**5 * (10**5 - 1) // 2
