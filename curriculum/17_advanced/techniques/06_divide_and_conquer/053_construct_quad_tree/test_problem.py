from solution import Node, construct


def _is_leaf(node: Node | None, val: bool) -> bool:
    return (
        node is not None
        and node.isLeaf
        and node.val is val
        and node.topLeft is None
        and node.topRight is None
        and node.bottomLeft is None
        and node.bottomRight is None
    )


def test_construct_all_ones():
    root = construct([[1, 1], [1, 1]])
    assert _is_leaf(root, True)


def test_construct_all_zeros():
    root = construct([[0, 0], [0, 0]])
    assert _is_leaf(root, False)


def test_construct_mixed():
    grid = [
        [0, 1],
        [1, 0],
    ]
    root = construct(grid)
    assert root is not None and not root.isLeaf
    assert _is_leaf(root.topLeft, False)
    assert _is_leaf(root.topRight, True)
    assert _is_leaf(root.bottomLeft, True)
    assert _is_leaf(root.bottomRight, False)


def test_construct_single():
    root = construct([[1]])
    assert _is_leaf(root, True)
