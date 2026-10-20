from solution import all_cells_dist_order


def assert_valid(rows: int, cols: int, r_center: int, c_center: int) -> None:
    cells = all_cells_dist_order(rows, cols, r_center, c_center)
    assert sorted(map(tuple, cells)) == [(r, c) for r in range(rows) for c in range(cols)]
    distances = [abs(r - r_center) + abs(c - c_center) for r, c in cells]
    assert distances == sorted(distances)


def test_all_cells_dist_order_one_row():
    assert all_cells_dist_order(1, 2, 0, 0) == [[0, 0], [0, 1]]


def test_all_cells_dist_order_two_by_two():
    assert_valid(2, 2, 0, 1)


def test_all_cells_dist_order_corner_center():
    assert_valid(2, 3, 1, 2)


def test_all_cells_dist_order_single_cell():
    assert all_cells_dist_order(1, 1, 0, 0) == [[0, 0]]


def test_all_cells_dist_order_center_of_grid():
    assert_valid(5, 4, 2, 1)
    assert all_cells_dist_order(5, 4, 2, 1)[0] == [2, 1]
