from solution import color_the_grid


def test_color_the_grid_example_single_cell():
    assert color_the_grid(1, 1) == 3


def test_color_the_grid_example_one_by_two():
    assert color_the_grid(1, 2) == 6


def test_color_the_grid_example_five_by_five():
    assert color_the_grid(5, 5) == 580986


def test_color_the_grid_tall_column():
    assert color_the_grid(3, 1) == 12


def test_color_the_grid_two_by_two():
    assert color_the_grid(2, 2) == 18
