from solution import flood_fill


def test_flood_fill_normal_case():
    image = [[1, 1, 1], [1, 1, 0], [1, 0, 1]]

    assert flood_fill(image, 1, 1, 2) == [[2, 2, 2], [2, 2, 0], [2, 0, 1]]


def test_flood_fill_already_target_color():
    assert flood_fill([[0, 0, 0]], 0, 0, 0) == [[0, 0, 0]]


def test_flood_fill_single_cell():
    assert flood_fill([[1]], 0, 0, 3) == [[3]]
