from solution import count_highest_score_nodes


def test_count_highest_score_nodes_example_one():
    assert count_highest_score_nodes([-1, 2, 0, 2, 0]) == 3


def test_count_highest_score_nodes_example_two():
    assert count_highest_score_nodes([-1, 2, 0]) == 2


def test_count_highest_score_nodes_two_nodes():
    assert count_highest_score_nodes([-1, 0]) == 2


def test_count_highest_score_nodes_chain():
    assert count_highest_score_nodes([-1, 0, 1, 2]) == 2


def test_count_highest_score_nodes_perfect_tree_root_wins():
    assert count_highest_score_nodes([-1, 0, 0, 1, 1, 2, 2]) == 1
