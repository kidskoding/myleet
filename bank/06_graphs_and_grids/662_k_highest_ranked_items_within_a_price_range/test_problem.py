from solution import highest_ranked_k_items


def test_highest_ranked_k_items_example_one():
    grid = [[1, 2, 0, 1], [1, 3, 0, 1], [0, 2, 5, 1]]
    assert highest_ranked_k_items(grid, [2, 5], [0, 0], 3) == [[0, 1], [1, 1], [2, 1]]


def test_highest_ranked_k_items_example_two():
    grid = [[1, 2, 0, 1], [1, 3, 3, 1], [0, 2, 5, 1]]
    assert highest_ranked_k_items(grid, [2, 3], [2, 3], 2) == [[2, 1], [1, 2]]


def test_highest_ranked_k_items_fewer_than_k():
    grid = [[1, 1, 1], [0, 0, 1], [2, 3, 4]]
    assert highest_ranked_k_items(grid, [2, 3], [0, 0], 3) == [[2, 1], [2, 0]]


def test_highest_ranked_k_items_start_is_item():
    assert highest_ranked_k_items([[5]], [1, 10], [0, 0], 1) == [[0, 0]]


def test_highest_ranked_k_items_walls_block():
    grid = [[1, 0, 4], [1, 0, 4]]
    assert highest_ranked_k_items(grid, [2, 5], [0, 0], 2) == []


def test_highest_ranked_k_items_tie_on_distance_and_price():
    grid = [[3, 1, 3]]
    assert highest_ranked_k_items(grid, [3, 3], [0, 1], 2) == [[0, 0], [0, 2]]
