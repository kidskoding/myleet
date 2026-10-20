from solution import count_visited_nodes


def test_count_visited_nodes_cycle_with_tail():
    assert count_visited_nodes([1, 2, 0, 0]) == [3, 3, 3, 4]


def test_count_visited_nodes_single_big_cycle():
    assert count_visited_nodes([1, 2, 3, 4, 0]) == [5, 5, 5, 5, 5]


def test_count_visited_nodes_two_node_cycle():
    assert count_visited_nodes([1, 0]) == [2, 2]


def test_count_visited_nodes_long_tail():
    assert count_visited_nodes([1, 0, 1, 2]) == [2, 2, 3, 4]


def test_count_visited_nodes_two_components():
    assert count_visited_nodes([1, 0, 3, 2]) == [2, 2, 2, 2]


def test_count_visited_nodes_branching_tails():
    assert count_visited_nodes([1, 2, 1, 0, 0, 4]) == [3, 2, 2, 4, 4, 5]
