from solution import Node, diameter


def tree(val: int, *children: Node) -> Node:
    return Node(val, list(children))


def test_diameter_single_node():
    assert diameter(tree(1)) == 0


def test_diameter_empty():
    assert diameter(None) == 0


def test_diameter_star():
    assert diameter(tree(1, tree(2), tree(3), tree(4))) == 2


def test_diameter_chain():
    assert diameter(tree(1, tree(2, tree(3, tree(4))))) == 3


def test_diameter_not_through_root():
    root = tree(1, tree(2, tree(3, tree(5)), tree(4, tree(6, tree(7)))))
    assert diameter(root) == 5


def test_diameter_uses_two_tallest_of_many_children():
    root = tree(1, tree(2, tree(3, tree(4))), tree(5, tree(6, tree(7, tree(8)))), tree(9, tree(10)))
    assert diameter(root) == 7
