from solution import construct


def shape(node):
    if node.is_leaf:
        assert node.top_left is None and node.bottom_right is None
        return int(node.val)
    return [shape(node.top_left), shape(node.top_right), shape(node.bottom_left), shape(node.bottom_right)]


def test_construct_checkerboard():
    assert shape(construct([[0, 1], [1, 0]])) == [0, 1, 1, 0]


def test_construct_mixed_quadrants():
    grid = [
        [1, 1, 1, 1, 0, 0, 0, 0],
        [1, 1, 1, 1, 0, 0, 0, 0],
        [1, 1, 1, 1, 1, 1, 1, 1],
        [1, 1, 1, 1, 1, 1, 1, 1],
        [1, 1, 1, 1, 0, 0, 0, 0],
        [1, 1, 1, 1, 0, 0, 0, 0],
        [1, 1, 1, 1, 0, 0, 0, 0],
        [1, 1, 1, 1, 0, 0, 0, 0],
    ]
    assert shape(construct(grid)) == [1, [0, 0, 1, 1], 1, 0]


def test_construct_single_cell():
    assert shape(construct([[1]])) == 1


def test_construct_uniform_grid_is_one_leaf():
    assert shape(construct([[0] * 4 for _ in range(4)])) == 0


def test_construct_one_odd_cell():
    grid = [[1, 1, 1, 1], [1, 1, 1, 1], [1, 1, 1, 1], [1, 1, 1, 0]]
    assert shape(construct(grid)) == [1, 1, 1, [1, 1, 1, 0]]
