from solution import generate


def test_generate_example_five_rows():
    assert generate(5) == [[1], [1, 1], [1, 2, 1], [1, 3, 3, 1], [1, 4, 6, 4, 1]]


def test_generate_example_one_row():
    assert generate(1) == [[1]]


def test_generate_two_rows():
    assert generate(2) == [[1], [1, 1]]


def test_generate_sixth_row():
    assert generate(6)[-1] == [1, 5, 10, 10, 5, 1]


def test_generate_thirty_rows_shape_and_middle():
    rows = generate(30)
    assert len(rows) == 30
    assert rows[-1][14] == 77558760
