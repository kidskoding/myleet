from solution import NaryNode, max_depth_nary


def build_sample_nary_tree() -> NaryNode:
    return NaryNode(1, [NaryNode(3, [NaryNode(5), NaryNode(6)]), NaryNode(2), NaryNode(4)])


def test_max_depth_nary_sample_tree():
    assert max_depth_nary(build_sample_nary_tree()) == 3


def test_max_depth_nary_empty():
    assert max_depth_nary(None) == 0


def test_max_depth_nary_single_node():
    assert max_depth_nary(NaryNode(1)) == 1
