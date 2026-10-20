from solution import sort_transformed_array


def test_sort_transformed_array_opens_up():
    assert sort_transformed_array([-4, -2, 2, 4], 1, 3, 5) == [3, 9, 15, 33]


def test_sort_transformed_array_opens_down():
    assert sort_transformed_array([-4, -2, 2, 4], -1, 3, 5) == [-23, -5, 1, 7]


def test_sort_transformed_array_linear_decreasing():
    assert sort_transformed_array([-3, 0, 1, 5], 0, -2, 1) == [-9, -1, 1, 7]


def test_sort_transformed_array_constant():
    assert sort_transformed_array([-1, 0, 1], 0, 0, 4) == [4, 4, 4]


def test_sort_transformed_array_single():
    assert sort_transformed_array([2], 3, -1, 0) == [10]


def test_sort_transformed_array_vertex_inside():
    assert sort_transformed_array([-3, -1, 0, 2, 3], 1, 0, 0) == [0, 1, 4, 9, 9]
