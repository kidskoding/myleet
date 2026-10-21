from solution import see_people


def test_see_people_single_row():
    assert see_people([[3, 1, 4, 2, 5]]) == [[2, 1, 2, 1, 0]]


def test_see_people_example_two():
    assert see_people([[5, 1], [3, 1], [4, 1]]) == [[3, 1], [2, 1], [1, 0]]


def test_see_people_single_cell():
    assert see_people([[7]]) == [[0]]


def test_see_people_increasing_row():
    assert see_people([[1, 2, 3]]) == [[1, 1, 0]]


def test_see_people_equal_heights():
    assert see_people([[2, 2, 2]]) == [[1, 1, 0]]
