from solution import last_marked_nodes


def test_last_marked_nodes_path():
    # 0-1-2 diameter endpoints 0 and 2
    assert last_marked_nodes([[0, 1], [1, 2]]) == [2, 0, 0] or last_marked_nodes(
        [[0, 1], [1, 2]]
    ) == [2, 2, 0]


def test_last_marked_nodes_star():
    ans = last_marked_nodes([[0, 1], [0, 2], [0, 3]])
    assert len(ans) == 4
    # From a leaf, last is some other leaf; from center, any leaf.
    assert ans[1] in {2, 3}
    assert ans[0] in {1, 2, 3}


def test_last_marked_nodes_two_nodes():
    ans = last_marked_nodes([[0, 1]])
    assert ans == [1, 0]
