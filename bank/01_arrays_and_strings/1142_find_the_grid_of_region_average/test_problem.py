from solution import result_grid


def test_result_grid_two_overlapping_regions():
    image = [[5, 6, 7, 10], [8, 9, 10, 10], [11, 12, 13, 10]]
    assert result_grid(image, 3) == [[9, 9, 9, 9], [9, 9, 9, 9], [9, 9, 9, 9]]


def test_result_grid_vertical_overlap():
    image = [[10, 20, 30], [15, 25, 35], [20, 30, 40], [25, 35, 45]]
    assert result_grid(image, 12) == [[25, 25, 25], [27, 27, 27], [27, 27, 27], [30, 30, 30]]


def test_result_grid_no_valid_region():
    image = [[5, 6, 7], [8, 9, 10], [11, 12, 13]]
    assert result_grid(image, 1) == [[5, 6, 7], [8, 9, 10], [11, 12, 13]]


def test_result_grid_uniform_zero_threshold():
    assert result_grid([[4, 4, 4], [4, 4, 4], [4, 4, 4]], 0) == [[4, 4, 4], [4, 4, 4], [4, 4, 4]]


def test_result_grid_floor_of_region_average():
    image = [[0, 0, 0], [0, 0, 0], [0, 0, 8]]
    assert result_grid(image, 8) == [[0, 0, 0], [0, 0, 0], [0, 0, 0]]


def test_result_grid_partially_covered():
    image = [[1, 1, 1, 200], [1, 1, 1, 200], [1, 1, 1, 200]]
    assert result_grid(image, 0) == [[1, 1, 1, 200], [1, 1, 1, 200], [1, 1, 1, 200]]
