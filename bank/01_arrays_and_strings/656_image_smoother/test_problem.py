from solution import image_smoother


def test_image_smoother_example_one():
    assert image_smoother([[1, 1, 1], [1, 0, 1], [1, 1, 1]]) == [[0, 0, 0], [0, 0, 0], [0, 0, 0]]


def test_image_smoother_example_two():
    img = [[100, 200, 100], [200, 50, 200], [100, 200, 100]]
    assert image_smoother(img) == [[137, 141, 137], [141, 138, 141], [137, 141, 137]]


def test_image_smoother_single_pixel():
    assert image_smoother([[5]]) == [[5]]


def test_image_smoother_single_row():
    assert image_smoother([[1, 2, 3]]) == [[1, 2, 2]]


def test_image_smoother_single_column():
    assert image_smoother([[4], [0], [8]]) == [[2], [4], [4]]
