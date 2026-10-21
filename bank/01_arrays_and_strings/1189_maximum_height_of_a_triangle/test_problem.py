from solution import max_height_of_triangle


def test_max_height_of_triangle_example_one():
    assert max_height_of_triangle(2, 4) == 3


def test_max_height_of_triangle_example_two():
    assert max_height_of_triangle(2, 1) == 2


def test_max_height_of_triangle_equal_one():
    assert max_height_of_triangle(1, 1) == 1


def test_max_height_of_triangle_skewed():
    assert max_height_of_triangle(10, 1) == 2
