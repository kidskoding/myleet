from solution import NaryNode, nary_preorder


def build_sample_nary_tree() -> NaryNode:
    return NaryNode(1, [NaryNode(3, [NaryNode(5), NaryNode(6)]), NaryNode(2), NaryNode(4)])


def test_nary_preorder_sample_tree():
    assert nary_preorder(build_sample_nary_tree()) == [1, 3, 5, 6, 2, 4]


def test_nary_preorder_empty():
    assert nary_preorder(None) == []
