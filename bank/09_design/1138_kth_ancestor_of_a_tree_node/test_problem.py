from solution import TreeAncestor


def test_tree_ancestor_example():
    t = TreeAncestor(7, [-1, 0, 0, 1, 1, 2, 2])
    assert t.get_kth_ancestor(3, 1) == 1
    assert t.get_kth_ancestor(5, 2) == 0
    assert t.get_kth_ancestor(6, 3) == -1


def test_tree_ancestor_chain():
    t = TreeAncestor(3, [-1, 0, 1])
    assert t.get_kth_ancestor(2, 1) == 1
    assert t.get_kth_ancestor(2, 2) == 0
    assert t.get_kth_ancestor(2, 3) == -1


def test_tree_ancestor_root():
    t = TreeAncestor(1, [-1])
    assert t.get_kth_ancestor(0, 1) == -1


def test_tree_ancestor_long_chain():
    t = TreeAncestor(5, [-1, 0, 1, 2, 3])
    assert t.get_kth_ancestor(4, 4) == 0
    assert t.get_kth_ancestor(4, 5) == -1
