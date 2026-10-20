from solution import NaryNode, nary_postorder


def build_sample_nary_tree() -> NaryNode:
    return NaryNode(1, [NaryNode(3, [NaryNode(5), NaryNode(6)]), NaryNode(2), NaryNode(4)])


def test_nary_postorder_sample_tree():
    assert nary_postorder(build_sample_nary_tree()) == [5, 6, 3, 2, 4, 1]


def test_nary_postorder_empty():
    assert nary_postorder(None) == []
