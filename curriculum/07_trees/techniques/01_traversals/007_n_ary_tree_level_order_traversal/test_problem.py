from solution import NaryNode, nary_level_order


def build_sample_nary_tree() -> NaryNode:
    return NaryNode(1, [NaryNode(3, [NaryNode(5), NaryNode(6)]), NaryNode(2), NaryNode(4)])


def test_nary_level_order_sample_tree():
    assert nary_level_order(build_sample_nary_tree()) == [[1], [3, 2, 4], [5, 6]]


def test_nary_level_order_empty():
    assert nary_level_order(None) == []
